import express from 'express';
import { getAIReview } from '../controllers/ai.controller.js';
import { apiLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { z } from 'zod';

const router = express.Router();

const aiSchema = z.object({
    body: z.object({
        language: z.string(),
        code: z.string().min(1, "Code cannot be empty")
    })
});

router.post('/review', apiLimiter, validate(aiSchema), getAIReview);

export default router;
