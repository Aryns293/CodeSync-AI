import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Config and Services
import { connectDB } from './src/config/db.js';
import { initGemini } from './src/services/gemini.service.js';
import { setupSocketHandlers } from './src/services/socket.service.js';

// Routes
import authRoutes from './src/routes/auth.routes.js';
import roomRoutes from './src/routes/room.routes.js';
import executionRoutes from './src/routes/execution.routes.js';

// Middlewares
import { errorHandler } from './src/middlewares/errorHandler.middleware.js';

dotenv.config({ path: path.join(import.meta.dirname, '../.env') });

const app = express();

// Init Config
connectDB();
initGemini();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Setup WebSockets
setupSocketHandlers(io);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/room', roomRoutes);
app.use('/api/v1/execution', executionRoutes);

// Static frontend build for production
const ROOT = path.join(import.meta.dirname, "..");
app.use(express.static(path.join(ROOT, "frontend/dist")));

app.get("*", (_, res) => {
    res.sendFile(path.join(ROOT, "frontend/dist/index.html"));
});

// Global Error Handler (must be last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
