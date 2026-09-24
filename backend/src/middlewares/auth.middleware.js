import { verifyAccessToken } from '../services/auth.service.js';
import { User } from '../models/User.model.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = await User.findById(decoded.id).select('-password -refreshToken');
        // Guard: token valid but user was deleted after it was issued
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized — account no longer exists' });
        }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};
