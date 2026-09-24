import { spawn, execFile as execFileCb } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { promisify } from "util";

const execFile = promisify(execFileCb);

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
  javascript: {
    filename: "main.js",
    cmd: "node main.js",
  },
};

export function sandboxSupportsLanguage(language) {
  return Boolean(runners[language]);
}

/**
 * Forcibly kills a named container and removes its record from the host.
 *
 * Two-phase cleanup:
 *  1. `docker kill`  — sends SIGKILL to PID 1 inside the container.
 *                      This stops the running process; the container itself
 *                      still exists in "exited" state afterwards.
 *  2. `docker rm -f` — unconditionally removes the container record, whether
 *                      it's still running or already exited. This is why an
 *                      explicit "inspect / verify exited" step is not needed:
 *                      `rm -f` handles both states.
 *
 * Both commands swallow their own errors — a failure in one step must never
 * propagate back to the caller or cause an unhandled rejection.
 */
async function forceKillContainer(containerId) {
  // Phase 1: send SIGKILL directly to the container (not just the CLI process)
  await execFile("docker", ["kill", containerId]).catch(() => {});

  // Phase 2: remove the stopped container record from the host unconditionally
  await execFile("docker", ["rm", "-f", containerId]).catch(() => {});
}

/**
 * Runs untrusted code inside a locked-down, single-use Docker container.
 *
 * Container lifecycle is fully explicit:
 *  - Container is named upfront (`exec_<uuid>`) so we always know which one to kill.
 *  - On timeout: kills the Docker CLI process AND the named container.
 *  - After kill: verifies the container actually exited (defensive cleanup).
 *  - On normal exit: `--rm` removes the container automatically at zero extra cost.
 *
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

  // ── Named container ──────────────────────────────────────────────────────────
  // Generate a unique container name before spawning.
  // This gives the timeout handler an explicit, trackable target to kill —
  // not just the Docker CLI process, but the actual running container.
  const containerId = `exec_${crypto.randomUUID()}`;

  const dockerArgs = [
    "run",
    "--name", containerId,          // named so we can `docker kill` it by ID later
    "--rm",                         // auto-remove on normal exit — no manual cleanup needed
    "-i",
    "--network", "none",            // no internet access from submitted code
    "--memory", "512m",
    "--memory-swap", "512m",
    "--cpus", "0.5",
    "--pids-limit", "64",           // blocks fork bombs
    "--security-opt", "no-new-privileges",
    "--cap-drop", "ALL",
    "-v", `${workDir}:/sandbox`,
    "-w", "/sandbox",
    SANDBOX_IMAGE,
    "bash",
    "-c",
    `ulimit -f 65536; ${runner.cmd}`,
  ];

  return new Promise((resolve) => {
    const child = spawn("docker", dockerArgs);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const MAX_OUTPUT = 100_000; // chars

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      resolve(result);
    };

    const timer = setTimeout(() => {
      // ── Timeout: two explicit kill targets ────────────────────────────────────
      //
      // Target 1 — the Docker CLI process (child).
      //   child is the `docker run` process Node.js spawned. Killing it reclaims
      //   the process handle but does NOT reach the container itself.
      //
      // Target 2 — the container by name (containerId).
      //   Without this, an infinite loop keeps running inside an orphaned container.
      //   Docker's resource limits will eventually intervene, but there is no
      //   explicit guarantee of when — and we can't verify it actually stopped.
      //   forceKillContainer kills the container, verifies it exited, then removes it.
      child.kill("SIGKILL");
      forceKillContainer(containerId).catch(() => {}); // fire-and-forget; errors are swallowed

      finish({ output: `Error: execution timed out after ${EXEC_TIMEOUT_MS / 1000}s`, isError: true });
    }, EXEC_TIMEOUT_MS);

    child.stdout.on("data", (d) => { 
      if (stdout.length < MAX_OUTPUT) {
        stdout += d;
        if (stdout.length >= MAX_OUTPUT) stdout += '\n\n...[Output truncated at 100,000 characters]';
      }
    });
    child.stderr.on("data", (d) => { 
      if (stderr.length < MAX_OUTPUT) {
        stderr += d;
        if (stderr.length >= MAX_OUTPUT) stderr += '\n\n...[Error output truncated at 100,000 characters]';
      }
    });

    child.on("error", (err) => {
      // Most common cause: docker isn't installed / daemon isn't reachable on this host.
      finish({ output: `Error: sandbox unavailable (${err.message})`, sandboxUnavailable: true, isError: true });
    });

    child.on("close", (exitCode) => {
      finish({ output: (stdout + (stdout && stderr ? '\n' : '') + stderr) || `Process exited with code ${exitCode}`, isError: exitCode !== 0 });
    });

    child.stdin.on("error", () => {});
    child.stdin.write(stdin || "");
    child.stdin.end();
  });
}
