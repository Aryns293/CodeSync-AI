import axios from "axios";

// Fallback execution provider - used when the Docker sandbox isn't reachable
// (e.g. the app is deployed on a host with no Docker daemon available).
// Free key: https://rapidapi.com/judge0-official/api/judge0-ce
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions";

// Judge0 CE language IDs for the three languages this IDE supports.
// Full list: GET https://judge0-ce.p.rapidapi.com/languages
const judge0LanguageIds = {
  cpp: 54, // C++ (GCC 9.2.0)
  python3: 71, // Python (3.8.1)
  java: 62, // Java (OpenJDK 13.0.1)
};

export function judge0IsConfigured() {
  return Boolean(RAPIDAPI_KEY);
}

export async function executeWithJudge0({ language, code, stdin }) {
  const languageId = judge0LanguageIds[language];
  if (!languageId) {
    return { output: `Error: unsupported language "${language}" for Judge0 execution` };
  }

  try {
    const { data } = await axios.post(
      JUDGE0_URL,
      {
        source_code: code,
        language_id: languageId,
        stdin: stdin || "",
      },
      {
        params: { base64_encoded: "false", wait: "true" },
        headers: {
          "content-type": "application/json",
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        timeout: 15_000,
      }
    );

    const output =
      data.stdout || data.stderr || data.compile_output || data.message || "No output";
    return { output };
  } catch (error) {
    return {
      output: `Error: ${error.response?.data?.message || error.message}`,
    };
  }
}
