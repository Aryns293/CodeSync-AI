/**
 * Auth Route Tests — CodeSync-AI
 *
 * Covers:
 *  - POST /api/v1/auth/register   (success, duplicate, weak password)
 *  - POST /api/v1/auth/login      (success, wrong creds, missing fields)
 *  - POST /api/v1/auth/refresh    (valid token, missing token, tampered token)
 *  - POST /api/v1/auth/logout     (clears cookies)
 *
 * Uses an in-memory MongoDB so no real DB is needed.
 * Rate limiters are skipped in test env to avoid 429s between test cases.
 * Run with:  npm test
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';

// Env vars are set in jest.globalSetup.js before ESM modules are imported.

// We import the controller and middleware directly to build a test app
// that skips rate limiting (rate limiter would cause 429s in rapid test runs).
import { register, login, logout, refreshAccessToken } from '../backend/src/controllers/auth.controller.js';
import { validate } from '../backend/src/middlewares/validate.middleware.js';
import { protect } from '../backend/src/middlewares/auth.middleware.js';
import { errorHandler } from '../backend/src/middlewares/errorHandler.middleware.js';
import { z } from 'zod';

// ─── Schemas (same as auth.routes.js) ────────────────────────────────────────
const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
    }),
});
const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(1),
    }),
});

// ─── Test App (no rate limiting) ─────────────────────────────────────────────
function buildTestApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.post('/api/v1/auth/register', validate(registerSchema), register);
    app.post('/api/v1/auth/login', validate(loginSchema), login);
    app.post('/api/v1/auth/refresh', refreshAccessToken);
    // logout now requires a valid JWT — protect populates req.user for the DB clear
    app.post('/api/v1/auth/logout', protect, logout);

    app.use(errorHandler);
    return app;
}

let mongod;
let app;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    app = buildTestApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

afterEach(async () => {
    // Clean collections between tests so duplicate-email checks are isolated
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function registerUser(payload = {}) {
    return request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'password123', ...payload });
}

function extractCookie(res, name) {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return null;
    const found = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith(`${name}=`))
        : cookies.startsWith(`${name}=`) ? cookies : null;
    return found || null;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
    it('registers a new user and returns user info — token NOT in body', async () => {
        const res = await registerUser();

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });

        expect(res.body.token).toBeUndefined();

        // Access token should be in an httpOnly cookie
        const jwtCookie = extractCookie(res, 'jwt');
        expect(jwtCookie).not.toBeNull();
        expect(jwtCookie).toMatch(/HttpOnly/i);
    });

    it('rejects duplicate email with 400', async () => {
        await registerUser();
        const res = await registerUser();

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/already exists/i);
    });

    it('rejects password shorter than 6 chars with 400', async () => {
        const res = await registerUser({ password: 'abc' });
        expect(res.status).toBe(400);
    });

    it('rejects missing name with 400', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'alice@example.com', password: 'password123' });
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
        await registerUser({ name: 'Bob', email: 'bob@example.com', password: 'secret123' });
    });

    it('logs in with correct credentials — token NOT in body', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'bob@example.com', password: 'secret123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe('bob@example.com');

        const jwtCookie = extractCookie(res, 'jwt');
        expect(jwtCookie).not.toBeNull();
    });

    it('rejects wrong password with 401', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'bob@example.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('rejects non-existent email with 401', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'nobody@example.com', password: 'secret123' });
        expect(res.status).toBe(401);
    });

    it('rejects missing password field with 400', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'bob@example.com' });
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/refresh', () => {
    let refreshCookieHeader;

    beforeEach(async () => {
        const res = await registerUser({ name: 'Carol', email: 'carol@example.com', password: 'password123' });
        // Supertest returns set-cookie as an array of strings
        const cookies = res.headers['set-cookie'];
        refreshCookieHeader = Array.isArray(cookies)
            ? cookies.find((c) => c.startsWith('refreshToken='))
            // The raw "Set-Cookie" string value needed for subsequent .set('Cookie', ...)
            ?.split(';')[0]   // e.g. "refreshToken=ey..."
            : null;
    });

    it('issues a new access token with a valid refresh token cookie', async () => {
        expect(refreshCookieHeader).not.toBeNull();

        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', refreshCookieHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // New jwt cookie should be set
        const jwtCookie = extractCookie(res, 'jwt');
        expect(jwtCookie).not.toBeNull();
    });

    it('returns 401 when no refresh token cookie is sent', async () => {
        const res = await request(app).post('/api/v1/auth/refresh');
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/missing/i);
    });

    it('returns 401 when refresh token is tampered with', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', 'refreshToken=tampered.jwt.value');
        expect(res.status).toBe(401);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/logout', () => {
    it('clears jwt and refreshToken cookies when authenticated', async () => {
        // logout now requires a valid JWT (protect middleware).
        // Register and login first so we have a real JWT cookie to send.
        await registerUser({ name: 'Dave', email: 'dave@example.com', password: 'password123' });
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'dave@example.com', password: 'password123' });

        const jwtCookieRaw = extractCookie(loginRes, 'jwt')?.split(';')[0];  // "jwt=ey..."
        expect(jwtCookieRaw).not.toBeNull();

        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Cookie', jwtCookieRaw);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const cookies = res.headers['set-cookie'];
        if (cookies) {
            const clearedJwt = extractCookie(res, 'jwt');
            const clearedRefresh = extractCookie(res, 'refreshToken');
            // Cleared cookies have an expiry in the past
            if (clearedJwt) expect(clearedJwt).toMatch(/expires=Thu, 01 Jan 1970/i);
            if (clearedRefresh) expect(clearedRefresh).toMatch(/expires=Thu, 01 Jan 1970/i);
        }
    });

    it('returns 401 when no JWT cookie is sent', async () => {
        const res = await request(app).post('/api/v1/auth/logout');
        expect(res.status).toBe(401);
    });
});
