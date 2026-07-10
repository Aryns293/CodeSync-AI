import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

// One shared image with g++, python3 and a JDK baked in (see execution-image/Dockerfile).
// Build it once with: docker build -t realtime-ide-sandbox ./backend/execution-image
const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE || "realtime-ide-sandbox:latest";
const EXEC_TIMEOUT_MS = 10_000; // kill anything (e.g. infinite loops) after 10s wall clock

// Each language: what file to write the submission to, and the shell command
// run *inside* the container to compile (if needed) and execute it.
const runners = {
  cpp: {
    filename: "main.cpp",
    cmd: "g++ main.cpp -O2 -o main && ./main",
  },
  python3: {
    filename: "main.py",
    cmd: "python3 main.py",
  },
  java: {
    // javac requires the public class name to match the filename - Main.java
    // is the convention most online judges (Judge0, LeetCode, etc.) use too.
    filename: "Main.java",
    cmd: "javac Main.java && java Main",
  },
};

export function sandboxSupportsLanguage(language) {
  return Boolean(runners[language]);
}

/**
 * Runs untrusted code inside a locked-down, single-use Docker container.
 * Returns { output } on success or timeout, matching the shape the rest of
 * the app already expects from the old Piston response.
 */
export async function executeInSandbox({ language, code, stdin }) {
  const runner = runners[language];
  if (!runner) {
    return { output: `Error: unsupported language "${language}" for sandbox execution` };
  }

  const workDir = path.join(os.tmpdir(), `sandbox-${crypto.randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });
  // 777 so the container's non-root "runner" user can write compiled binaries
  // back into this bind-mounted directory regardless of host UID mapping.
  await fs.chmod(workDir, 0o777);
  await fs.writeFile(path.join(workDir, runner.filename), code ?? "");

  const dockerArgs = [
    "run",
    "--rm",
    "-i",
    "--network",
    "none", // no internet access from submitted code
    "--memory",
    "128m",
    "--memory-swap",
    "128m", // disable swap so memory limit is real
    "--cpus",
    "0.5",
    "--pids-limit",
    "64", // blocks fork bombs
    "--security-opt",
    "no-new-privileges",
    "--cap-drop",
    "ALL",
    "-v",
    `${workDir}:/sandbox`,
    "-w",
    "/sandbox",
    SANDBOX_IMAGE,
    "bash",
    "-c",
    runner.cmd,
  ];

  return new Promise((resolve) => {
    const child = spawn("docker", dockerArgs);
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ output: `Error: execution timed out after ${EXEC_TIMEOUT_MS / 1000}s` });
    }, EXEC_TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (err) => {
      // Most common cause: docker isn't installed / daemon isn't reachable on this host.
      finish({ output: `Error: sandbox unavailable (${err.message})` });
    });

    child.on("close", (exitCode) => {
      finish({ output: stdout || stderr || `Process exited with code ${exitCode}` });
    });

    child.stdin.write(stdin || "");
    child.stdin.end();
  });
}
