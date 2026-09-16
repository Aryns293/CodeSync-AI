import { User } from '../models/User.model.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../services/auth.service.js';

// ─── Cookie helpers ───────────────────────────────────────────────────────────
const ACCESS_COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 min
};

const REFRESH_COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({ name, email, password });
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie('jwt', token, ACCESS_COOKIE_OPTS);
        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);

        // Fix #6: Do NOT return the raw token in the response body.
        // Tokens live exclusively in httpOnly cookies to prevent XSS-based theft.
        res.status(201).json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (error) {
        next(error);
    }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie('jwt', token, ACCESS_COOKIE_OPTS);
        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);

        // Fix #6: Token only in cookie, not in JSON body.
        res.status(200).json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (error) {
        next(error);
    }
};

// ─── Refresh Access Token (Fix #5) ────────────────────────────────────────────
export const refreshAccessToken = async (req, res, next) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token missing' });
        }

        // 1. Verify signature and expiry
        let decoded;
        try {
            decoded = verifyRefreshToken(incomingRefreshToken);
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        // 2. Check the token matches what we stored in DB (rotation guard)
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== incomingRefreshToken) {
            // Token reuse detected — invalidate the stored token (token rotation)
            if (user) {
                user.refreshToken = null;
                await user.save();
            }
            return res.status(401).json({ success: false, message: 'Refresh token reuse detected. Please log in again.' });
        }

        // 3. Issue a fresh access token
        const newAccessToken = generateToken(user._id);
        res.cookie('jwt', newAccessToken, ACCESS_COOKIE_OPTS);

        res.status(200).json({ success: true, message: 'Access token refreshed' });
    } catch (error) {
        next(error);
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
    try {
        if (req.user) {
            req.user.refreshToken = null;
            await req.user.save();
        }

        res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
        res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0) });

        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
    try {
        const { name, password } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name) user.name = name;
        if (password) user.password = password; // Will be hashed by pre-save hook

        await user.save();

        res.status(200).json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email },
            message: 'Profile updated successfully'
        });
    } catch (error) {
        next(error);
    }
};
