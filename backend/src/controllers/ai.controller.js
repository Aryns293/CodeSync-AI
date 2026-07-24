import { generateReview } from '../services/gemini.service.js';

export const getAIReview = async (req, res, next) => {
    try {
        const { code, language } = req.body;
        const text = await generateReview(code, language);
        res.status(200).json({ success: true, review: text });
    } catch (error) {
        next(error);
    }
};
