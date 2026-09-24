import express from 'express';
import { register, login, logout, updateProfile, refreshAccessToken } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authLimiter, apiLimiter } from '../middlewares/rateLimiter.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const router = express.Router();

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required")
    })
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, "Password must contain at least one uppercase letter, one lowercase letter, and one number").optional(),
        currentPassword: z.string().optional()
    })
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Use apiLimiter instead of authLimiter to avoid 429 errors from NAT/VPN shared IPs
router.post('/refresh', apiLimiter, refreshAccessToken);

router.post('/logout', apiLimiter, protect, logout);
router.put('/profile', apiLimiter, protect, validate(updateProfileSchema), updateProfile);

export default router;
