import jwt from 'jsonwebtoken';

// Fail loudly at startup if secrets are missing.
// A missing JWT_SECRET is a critical misconfiguration — never silently degrade.
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
}
if (!JWT_REFRESH_SECRET) {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not set. Server cannot start.');
}

export const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: '15m',
    });
};

export const generateRefreshToken = (id) => {
    return jwt.sign({ id }, JWT_REFRESH_SECRET, {
        expiresIn: '7d',
    });
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};
