import './env.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Config and Services
import { connectDB } from './src/config/db.js';
import { initGemini } from './src/services/gemini.service.js';
import { setupSocketHandlers } from './src/sockets/index.js';

// Routes
import authRoutes from './src/routes/auth.routes.js';
import roomRoutes from './src/routes/room.routes.js';

// Middlewares
import { errorHandler } from './src/middlewares/errorHandler.middleware.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reflect-any-origin + credentials:true is a known security misconfiguration.
// In production set ALLOWED_ORIGINS="https://yourdomain.com" in your env file.
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : null;

const allowOrigin = (origin) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin) return true;
    
    // If user defined a strict allowlist, enforce it
    if (ALLOWED_ORIGINS) {
        return ALLOWED_ORIGINS.includes(origin);
    }

    // Only allow fallback reflect-origin in development mode for convenience
    return process.env.NODE_ENV !== 'production';
};

const corsOptions = {
    origin: (origin, callback) => {
        if (allowOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
};

const app = express();
app.set('trust proxy', 1); // Trust first proxy (e.g., Render, Heroku) for rate limiting and true client IPs

// Init Config
connectDB();
initGemini();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Socket.io boolean true = reflect origin
            callback(null, allowOrigin(origin));
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Setup WebSockets; auth middleware is configured inside setupSocketHandlers.
setupSocketHandlers(io);
app.set('io', io);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/room', roomRoutes);

// Explicit 404 for unmatched API routes to prevent the SPA fallback from returning HTML
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found' });
});

// Static frontend build for production
const ROOT = path.join(__dirname, "..");
const frontendDistPath = path.join(ROOT, "frontend/dist");
app.use(express.static(frontendDistPath));

app.get("*", (_, res, next) => {
    res.sendFile(path.join(frontendDistPath, "index.html"), (err) => err && next());
});

// Global Error Handler (must be last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
