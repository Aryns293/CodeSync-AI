import express from 'express';
import { executeCode } from '../controllers/execution.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { z } from 'zod';

const router = express.Router();

const executionSchema = z.object({
    body: z.object({
        language: z.string(),
        code: z.string(),
        stdin: z.string().optional(),
        roomId: z.string().optional()
    })
});

router.post('/', apiLimiter, optionalAuth, validate(executionSchema), executeCode);

export default router;
