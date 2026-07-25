import express from 'express';
import { register, login, logout, updateProfile } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const router = express.Router();

const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters")
    })
});

const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required")
    })
});

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        password: z.string().min(6, "Password must be at least 6 characters").optional()
    })
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);

export default router;
