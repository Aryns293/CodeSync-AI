import axios from "axios";

// Get credentials dynamically to ensure dotenv is loaded
export function jdoodleIsConfigured() {
  return Boolean(process.env.JDOODLE_CLIENT_ID && process.env.JDOODLE_CLIENT_SECRET);
}

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";

// JDoodle language codes and version index
const jdoodleLanguages = {
  cpp: { language: "cpp", versionIndex: "5" },         // C++ 17 (GCC 9.1.0)
  python3: { language: "python3", versionIndex: "3" }, // Python 3.9.9
  java: { language: "java", versionIndex: "4" },       // JDK 17.0.1
};

export async function executeWithJDoodle({ language, code, stdin }) {
  const langConfig = jdoodleLanguages[language];
  if (!langConfig) {
    return { output: `Error: unsupported language "${language}" for JDoodle execution` };
  }

  try {
    const { data } = await axios.post(
      JDOODLE_URL,
      {
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        language: langConfig.language,
        versionIndex: langConfig.versionIndex,
        stdin: stdin || "",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    );

    // JDoodle returns { output: "...", statusCode: 200, memory: "...", cpuTime: "..." }
    const output = data.output || "No output";
    return { output };
  } catch (error) {
    return {
      output: `Error: ${error.response?.data?.error || error.message}`,
    };
  }
}
