import { GoogleGenAI } from "@google/genai";

let aiInstance = null;

export const initGemini = () => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set - AI Review will fail until it's added to .env");
    } else {
        aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
};

export const generateReview = async (code, language) => {
    if (!aiInstance) {
        throw new Error("AI service is not configured (missing API key).");
    }

    const prompt = `
You are an expert ${language} code reviewer.
Review the following code and provide a highly structured Markdown response strictly following this format:

### 🚨 Critical Bugs
(List any severe bugs, security issues, or logic errors. If none, write "None detected.")

### 💡 Code Improvements & Best Practices
(List performance optimizations, readability improvements, and language-specific best practices using bullet points.)

### 🛠️ Corrected Code
(Provide the fully corrected and optimized code block in ${language}.)

**Code to review:**
\`\`\`${language}
${code}
\`\`\`
`;

    const response = await aiInstance.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
    });

    return response.text;
};
