import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
// Resolve relative to this file, not process.cwd() - otherwise `npm start`
// (which `cd`s into backend/ first) and `npm run dev` (which doesn't) load
// .env from two different places and one of them silently finds nothing.
dotenv.config({ path: path.join(import.meta.dirname, '../.env') });
import { GoogleGenAI } from "@google/genai";
import { executeInSandbox, sandboxSupportsLanguage } from "./sandbox.js";
import { executeWithJudge0, judge0IsConfigured } from "./judge0.js";

const app = express();

// Optional Render free-tier keep-alive: only runs if you set your own deployed
// URL here once you have one. Leave unset locally / before you've deployed.
const SELF_PING_URL = process.env.SELF_PING_URL || "";
const interval = 30000;

function reloadWebsite() {
  if (!SELF_PING_URL) return;
  axios
    .get(SELF_PING_URL)
    .then(() => {
      console.log("keep-alive ping ok");
    })
    .catch((error) => {
      console.error(`keep-alive ping failed: ${error.message}`);
    });
}

if (SELF_PING_URL) {
  setInterval(reloadWebsite, interval);
}

const server = http.createServer(app);

const rooms = new Map();
const roomData = new Map();
const lastAction = new Map(); // socket.id -> { compile: ts, review: ts } - simple abuse guard

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set - AI Review will fail until it's added to .env");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Primary execution path is the local Docker sandbox (see backend/sandbox.js).
// Set USE_DOCKER_SANDBOX=false to force Judge0 (e.g. on a host with no Docker daemon).
const USE_DOCKER_SANDBOX = process.env.USE_DOCKER_SANDBOX !== "false";

function detectLang(code) {
    if (code.includes("#include")) return "C++";
    if (code.includes("def ") || code.includes("print(")) return "Python";
    if (code.includes("function") || code.includes("console.")) return "JavaScript";
    if (code.includes("public class") || code.includes("System.out")) return "Java";
    return "code";
}

// Returns true (and blocks the action) if this socket used `key` more recently than cooldownMs ago.
function throttled(socket, key, cooldownMs) {
    const now = Date.now();
    const entry = lastAction.get(socket.id) || {};
    if (entry[key] && now - entry[key] < cooldownMs) {
        return true;
    }
    entry[key] = now;
    lastAction.set(socket.id, entry);
    return false;
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    let currentRoom = null;
    let currentUser = null;

    socket.on("join", ({ roomId, userName }) => {
        // Leave previous room if any
        if (currentRoom) {
            socket.leave(currentRoom);
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
        }

        currentRoom = roomId;
        currentUser = userName;

        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(userName);
        io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));

        const roomInfo = roomData.get(roomId);
        if (roomInfo?.code) {
            socket.emit("codeUpdate", roomInfo.code);
        }
        if (roomInfo?.language) {
            socket.emit("languageUpdate", roomInfo.language);
        }
    });

    socket.on("codeChange", ({ roomId, code }) => {
        socket.to(roomId).emit("codeUpdate", code);

        if (!roomData.has(roomId)) roomData.set(roomId, {});
        roomData.get(roomId).code = code;
    });

    socket.on("leaveRoom", () => {
         if(currentRoom && currentUser){
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
            socket.leave(currentRoom);
            currentRoom = null;
            currentUser = null;
        }
        console.log('A user disconnected');
    })

    socket.on("typing", (roomId, userName) => {
        socket.to(roomId).emit("userTyping", userName);
    })

    socket.on("languageChange", ({ roomId, language }) => {
        io.to(roomId).emit("languageUpdate", language);

        if (!roomData.has(roomId)) roomData.set(roomId, {});
        roomData.get(roomId).language = language;
    });

    socket.on("compileCode", async ({ code, roomId, language, stdin }) => {
        if (!rooms.has(roomId)) return;

        if (throttled(socket, "compile", 3000)) {
            socket.emit("codeResponse", {
                run: { output: "Slow down a little - please wait a couple seconds between runs." },
            });
            return;
        }

        try {
            let result;
            if (USE_DOCKER_SANDBOX && sandboxSupportsLanguage(language)) {
                result = await executeInSandbox({ language, code, stdin });
                // Graceful degradation: if this host has no Docker daemon, fall back
                // to Judge0 automatically instead of just failing the request.
                if (result.output?.startsWith("Error: sandbox unavailable") && judge0IsConfigured()) {
                    console.warn("Docker sandbox unavailable, falling back to Judge0");
                    result = await executeWithJudge0({ language, code, stdin });
                }
            } else if (judge0IsConfigured()) {
                result = await executeWithJudge0({ language, code, stdin });
            } else {
                result = { output: `Error: no execution provider configured for "${language}"` };
            }
            socket.emit("codeResponse", { run: result }); // only sent to the executor, matching original behavior
        } catch (error) {
            console.error("compileCode error:", error);
            socket.emit("codeResponse", { run: { output: `Error: ${error.message}` } });
        }
    });

    socket.on("getAIReview", async ({ roomId, code }) => {
        if (throttled(socket, "review", 8000)) {
            io.to(roomId).emit("AIReview", "Please wait a few seconds before requesting another review.");
            return;
        }

        try {
            // Use the language the room actually has selected instead of guessing from
            // the code text - roomData is already kept up to date by "languageChange".
            const language = roomData.get(roomId)?.language || detectLang(code);

            const prompt = `
            You're an expert code reviewer of the language "${language}" and love to give code suggestions.
            Generate a brief review of the code below.
            Format clearly with headings, and use bullet points.

            \`\`\`
            ${code}
            \`\`\`
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            io.to(roomId).emit("AIReview", response.text);
        } catch (error) {
            console.error("getAIReview error:", error);
            io.to(roomId).emit("AIReview", "Unable to review currently, please try later.");
        }
    })

    socket.on("disconnect" , () => {
        if(currentRoom && currentUser){
            rooms.get(currentRoom).delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
        }
        lastAction.delete(socket.id);
        console.log('A user disconnected');
    })
});
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
