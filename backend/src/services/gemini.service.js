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
    You're an expert code reviewer of the language "${language}" and love to give code suggestions.
    Generate a brief review of the code below.
    Format clearly with headings, and use bullet points.

    \`\`\`
    ${code}
    \`\`\`
    `;

    const response = await aiInstance.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
    });

    return response.text;
};
