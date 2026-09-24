import jwt from 'jsonwebtoken';

// Fail loudly at startup if secrets are missing.
// A missing JWT_SECRET is a critical misconfiguration — never silently degrade.
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const PLACEHOLDERS = ['replace_with_a_long_random_secret', 'replace_with_a_different_long_random_secret'];

if (!JWT_SECRET || PLACEHOLDERS.includes(JWT_SECRET)) {
    throw new Error('FATAL: JWT_SECRET missing or left as placeholder.');
}
if (!JWT_REFRESH_SECRET || PLACEHOLDERS.includes(JWT_REFRESH_SECRET)) {
    throw new Error('FATAL: JWT_REFRESH_SECRET missing or left as placeholder.');
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

export const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
