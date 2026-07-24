import { runCode } from './execution.service.js';
import { generateReview } from './gemini.service.js';
import { Room } from '../models/Room.model.js';

const rooms = new Map();
const roomData = new Map();
const lastAction = new Map();

function detectLang(code) {
    if (code.includes("#include")) return "C++";
    if (code.includes("def ") || code.includes("print(")) return "Python";
    if (code.includes("function") || code.includes("console.")) return "JavaScript";
    if (code.includes("public class") || code.includes("System.out")) return "Java";
    return "code";
}

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

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        let currentRoom = null;
        let currentUser = null;

        socket.on("join", async ({ roomId, userName }) => {
            if (currentRoom) {
                socket.leave(currentRoom);
                rooms.get(currentRoom)?.delete(currentUser);
                io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
            }

            currentRoom = roomId;
            currentUser = userName;

            socket.join(roomId);

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add(userName);
            io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));

            // Fetch from DB if not in memory
            let roomInfo = roomData.get(roomId);
            if (!roomInfo) {
                const dbRoom = await Room.findOne({ roomId });
                if (dbRoom) {
                    roomInfo = { code: dbRoom.code, language: dbRoom.language };
                    roomData.set(roomId, roomInfo);
                }
            }

            if (roomInfo?.code) socket.emit("codeUpdate", roomInfo.code);
            if (roomInfo?.language) socket.emit("languageUpdate", roomInfo.language);
        });

        socket.on("codeChange", async ({ roomId, code }) => {
            socket.to(roomId).emit("codeUpdate", code);
            
            if (!roomData.has(roomId)) roomData.set(roomId, {});
            roomData.get(roomId).code = code;

            // Debounced save to DB can be added here
        });

        socket.on("leaveRoom", () => {
             if(currentRoom && currentUser){
                rooms.get(currentRoom)?.delete(currentUser);
                io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
                socket.leave(currentRoom);
                currentRoom = null;
                currentUser = null;
            }
        });

        socket.on("typing", (roomId, userName) => {
            socket.to(roomId).emit("userTyping", userName);
        });

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

            // Using our new execution service
            const result = await runCode({ language, code, stdin, roomId, userId: socket.user?.id });
            socket.emit("codeResponse", { run: result });
        });

        socket.on("getAIReview", async ({ roomId, code }) => {
            if (throttled(socket, "review", 8000)) {
                io.to(roomId).emit("AIReview", "Please wait a few seconds before requesting another review.");
                return;
            }

            try {
                const language = roomData.get(roomId)?.language || detectLang(code);
                const text = await generateReview(code, language);
                io.to(roomId).emit("AIReview", text);
            } catch (error) {
                console.error("AI Review error:", error.message);
                io.to(roomId).emit("AIReview", "Failed to generate AI review. Please make sure GEMINI_API_KEY is configured.");
            }
        });

        socket.on("disconnect" , () => {
            if(currentRoom && currentUser){
                rooms.get(currentRoom)?.delete(currentUser);
                io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
            }
            lastAction.delete(socket.id);
            console.log('A user disconnected');
        });
    });
};
