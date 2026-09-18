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
import { setupSocketHandlers } from './src/services/socket.service.js';

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

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, same-origin)
        if (!origin) return callback(null, true);
        
        // If user defined a strict allowlist, enforce it
        if (ALLOWED_ORIGINS) {
            if (ALLOWED_ORIGINS.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`CORS: origin ${origin} is not allowed`));
        }

        // Only allow fallback reflect-origin in development mode for convenience
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // In production, reject unconfigured cross-origin requests
        return callback(new Error(`CORS: origin ${origin} is not allowed (ALLOWED_ORIGINS not set)`));
    },
    credentials: true,
};

const app = express();

// Init Config
connectDB();
initGemini();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Use strict allowlist if defined, otherwise reflect origin (true) ONLY in dev
        origin: ALLOWED_ORIGINS || (process.env.NODE_ENV !== 'production' ? true : []),
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

// Static frontend build for production
const ROOT = path.join(__dirname, "..");
const frontendDistPath = path.join(ROOT, "frontend/dist");
app.use(express.static(frontendDistPath));

app.get("*", (_, res) => {
    res.sendFile(path.join(ROOT, "frontend/dist/index.html"));
});

// Global Error Handler (must be last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
