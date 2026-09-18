import jwt from 'jsonwebtoken';
import { runCode } from './execution.service.js';
import { generateReview } from './gemini.service.js';
import { Room } from '../models/Room.model.js';
import { User } from '../models/User.model.js';
import * as Y from 'yjs';
import * as cookie from 'cookie';
import { z } from 'zod';

const rooms = new Map();
const roomData = new Map();
const ydocs = new Map();
const lastAction = new Map();
const saveTimeouts = new Map();
const roomCompileTime = new Map();

const languageSchema = z.enum(['cpp', 'python3', 'java', 'javascript']);
const roomPayloadSchema = z.object({ roomId: z.string().uuid() });
const joinPayloadSchema = roomPayloadSchema;
const yjsUpdatePayloadSchema = roomPayloadSchema.extend({
    update: z.any().refine(
        (value) => value instanceof ArrayBuffer || ArrayBuffer.isView(value) || Array.isArray(value),
        'Invalid Yjs update payload'
    ),
    timestamp: z.string().datetime().optional(),
});
const cursorPayloadSchema = roomPayloadSchema.extend({
    position: z.object({
        lineNumber: z.number().int().positive(),
        column: z.number().int().positive(),
    }),
});
const languagePayloadSchema = roomPayloadSchema.extend({ language: languageSchema });
const compilePayloadSchema = roomPayloadSchema.extend({
    stdin: z.string().max(20_000).optional(),
});

function parseSocketPayload(socket, schema, payload) {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        socket.emit('socketValidationError', {
            message: 'Invalid socket event payload',
            errors: parsed.error.issues,
        });
        return null;
    }
    return parsed.data;
}

async function persistRoomState(roomId, data = roomData.get(roomId), ydoc = ydocs.get(roomId)) {
    if (!data && !ydoc) return;

    try {
        const updateQuery = { $set: {} };

        if (data) {
            if (data.language !== undefined) updateQuery.$set.language = data.language;
            if (data.lastModifiedBy !== undefined) updateQuery.$set.lastModifiedBy = data.lastModifiedBy;
            if (data.lastModifiedAt !== undefined) updateQuery.$set.lastModifiedAt = data.lastModifiedAt;
        }

        if (ydoc) {
            updateQuery.$set.ydocState = Buffer.from(Y.encodeStateAsUpdate(ydoc));
            updateQuery.$set.code = ydoc.getText('code').toString();
        }

        if (Object.keys(updateQuery.$set).length > 0) {
            await Room.findOneAndUpdate({ roomId }, updateQuery);
        }
    } catch (error) {
        console.error(`Error saving room ${roomId} to DB:`, error);
    }
}

// Cleanup when a room becomes empty after flushing its latest in-memory state.
async function cleanupRoomIfEmpty(roomId) {
    const roomUsers = rooms.get(roomId);
    if (!roomUsers || roomUsers.size > 0) return;

    if (saveTimeouts.has(roomId)) {
        clearTimeout(saveTimeouts.get(roomId));
        saveTimeouts.delete(roomId);
    }

    await persistRoomState(roomId);

    rooms.delete(roomId);
    roomData.delete(roomId);
    ydocs.delete(roomId);
    roomCompileTime.delete(roomId);
}

function scheduleDbSave(roomId) {
    if (saveTimeouts.has(roomId)) {
        clearTimeout(saveTimeouts.get(roomId));
    }
    
    saveTimeouts.set(roomId, setTimeout(async () => {
        saveTimeouts.delete(roomId);
        await persistRoomState(roomId);
    }, 2000));
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

// Remove a user from a room, notify others, and clean up empty rooms.
async function removeUserFromRoom(io, socket, roomId) {
    rooms.get(roomId)?.delete(socket.id);
    const usersInRoom = Array.from(
        new Map(
            Array.from(rooms.get(roomId)?.values() || []).map((u) => [u.id, u])
        ).values()
    );
    io.to(roomId).emit('userJoined', usersInRoom);
    await cleanupRoomIfEmpty(roomId);
}

export const setupSocketHandlers = (io) => {
    // Socket.IO auth middleware runs before any event handler and verifies the JWT from the httpOnly cookie.
    // Unauthenticated connections are rejected here before they can touch any room data.
    io.use(async (socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers.cookie || '');
            const token = cookies.jwt;

            if (!token) {
                return next(new Error('Authentication error: no token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password -refreshToken');
            if (!user) {
                return next(new Error('Authentication error: user not found'));
            }

            // Attach the verified server-side user — client can no longer spoof identity.
            socket.user = { id: user._id.toString(), name: user.name, email: user.email };
            next();
        } catch (err) {
            next(new Error('Authentication error: invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id, '→', socket.user.name);

        // Group all of a user's tabs/devices into a single personal room 
        // to allow forced disconnection on logout/session-expiry.
        socket.join(`user:${socket.user.id}`);

        let currentRoom = null;

        socket.on('join', async (payload) => {
            const parsed = parseSocketPayload(socket, joinPayloadSchema, payload);
            if (!parsed) return;
            const { roomId } = parsed;
            const user = socket.user;

            let roomInfo = roomData.get(roomId);
            const dbRoom = await Room.findOne({ roomId });
            if (!dbRoom) {
                socket.emit('roomError', { message: 'Room not found' });
                return;
            }
            if (!roomInfo) {
                roomInfo = {
                    language: dbRoom.language,
                    lastModifiedBy: dbRoom.lastModifiedBy,
                    lastModifiedAt: dbRoom.lastModifiedAt,
                };
                roomData.set(roomId, roomInfo);
            }

            if (currentRoom) {
                socket.leave(currentRoom);
                await removeUserFromRoom(io, socket, currentRoom);
            }

            currentRoom = roomId;

            socket.join(roomId);

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Map());
            }
            rooms.get(roomId).set(socket.id, user);
            const usersInRoom = Array.from(
                new Map(Array.from(rooms.get(roomId).values()).map((u) => [u.id, u])).values()
            );
            io.to(roomId).emit('userJoined', usersInRoom);

            // Hydrate Y.Doc if not present in memory
            if (!ydocs.has(roomId)) {
                const ydoc = new Y.Doc();
                if (dbRoom.ydocState) {
                    Y.applyUpdate(ydoc, new Uint8Array(dbRoom.ydocState));
                } else if (dbRoom.code) {
                    // Backwards compatibility for existing old rooms
                    ydoc.getText('code').insert(0, dbRoom.code);
                } else {
                    ydoc.getText('code').insert(0, '// start coding here...');
                }
                ydocs.set(roomId, ydoc);
            }

            // Sync CRDT state to the joining client
            const ydoc = ydocs.get(roomId);
            const stateUpdate = Y.encodeStateAsUpdate(ydoc);
            socket.emit('yjs-sync', stateUpdate);

            if (roomInfo) {
                socket.emit('codeUpdate', { 
                    lastModifiedBy: roomInfo.lastModifiedBy,
                    lastModifiedAt: roomInfo.lastModifiedAt,
                });
            }
            if (roomInfo?.language) socket.emit('languageUpdate', roomInfo.language);
        });

        socket.on('yjs-update', (payload, callback) => {
            const parsed = parseSocketPayload(socket, yjsUpdatePayloadSchema, payload);
            if (!parsed) return;
            const { roomId, update, timestamp } = parsed;
            if (roomId !== currentRoom) return;
            const doc = ydocs.get(roomId);
            if (!doc) return;

            try {
                // Apply binary update to authoritative server doc
                Y.applyUpdate(doc, new Uint8Array(update));
                
                // Rebroadcast to everyone else in the room
                socket.to(roomId).emit('yjs-update', { update });
    
                const userName = socket.user.name;
                const modifiedAt = timestamp || new Date().toISOString();
                socket.to(roomId).emit('codeUpdate', { lastModifiedBy: userName, lastModifiedAt: modifiedAt });
                
                if (!roomData.has(roomId)) roomData.set(roomId, {});
                roomData.get(roomId).lastModifiedBy = userName;
                roomData.get(roomId).lastModifiedAt = modifiedAt;
    
                scheduleDbSave(roomId);
            } catch (error) {
                console.error(`[Yjs] Failed to apply update from socket ${socket.id} in room ${roomId}:`, error.message);
                // Optionally emit an error back to the offending client
                socket.emit('error', 'Malformed document update received');
            }
            if (typeof callback === 'function') callback();
        });

        socket.on('leaveRoom', () => {
            if (currentRoom) {
                socket.leave(currentRoom);
                void removeUserFromRoom(io, socket, currentRoom);
                currentRoom = null;
            }
        });

        socket.on('typing', (payload) => {
            const parsed = parseSocketPayload(socket, roomPayloadSchema, payload);
            if (!parsed) return;
            const { roomId } = parsed;
            if (roomId !== currentRoom) return;
            socket.to(roomId).emit('userTyping', { userName: socket.user.name, userId: socket.user.id });
        });

        socket.on('cursorChange', (payload) => {
            const parsed = parseSocketPayload(socket, cursorPayloadSchema, payload);
            if (!parsed) return;
            const { roomId, position } = parsed;
            if (roomId !== currentRoom) return;
            socket.to(roomId).emit('cursorUpdate', {
                userId: socket.user.id,
                userName: socket.user.name,
                position,
            });
        });

        socket.on('languageChange', (payload) => {
            const parsed = parseSocketPayload(socket, languagePayloadSchema, payload);
            if (!parsed) return;
            const { roomId, language } = parsed;
            if (roomId !== currentRoom) return;
            io.to(roomId).emit('languageUpdate', language);
            if (!roomData.has(roomId)) roomData.set(roomId, {});
            roomData.get(roomId).language = language;
            scheduleDbSave(roomId);
        });

        socket.on('compileCode', async (payload) => {
            const parsed = parseSocketPayload(socket, compilePayloadSchema, payload);
            if (!parsed) return;
            const { roomId, stdin } = parsed;
            if (roomId !== currentRoom) return;
            if (!rooms.has(roomId)) return;

            if (throttled(socket, 'compile', 3000)) {
                socket.emit('codeResponse', {
                    run: { output: 'Slow down a little - please wait a couple seconds between runs.' },
                });
                return;
            }

            const now = Date.now();
            if (now - (roomCompileTime.get(roomId) ?? 0) < 5000) {
                socket.emit('codeResponse', { run: { output: 'Room is busy — someone just ran code. Wait a moment.' } });
                return;
            }
            roomCompileTime.set(roomId, now);

            const roomInfo = roomData.get(roomId);
            const doc = ydocs.get(roomId);
            if (!roomInfo || !doc) return;
            const code = doc.getText('code').toString();
            const language = roomInfo.language || 'cpp';

            const result = await runCode({ language, code, stdin, roomId, userId: socket.user.id });
            io.to(roomId).emit('codeResponse', { run: result });
        });

        socket.on('getAIReview', async (payload) => {
            const parsed = parseSocketPayload(socket, roomPayloadSchema, payload);
            if (!parsed) return;
            const { roomId } = parsed;
            if (roomId !== currentRoom) return;
            if (throttled(socket, 'review', 8000)) {
                io.to(roomId).emit('AIReview', 'Please wait a few seconds before requesting another review.');
                return;
            }

            try {
                const roomInfo = roomData.get(roomId);
                const doc = ydocs.get(roomId);
                if (!roomInfo || !doc) return;
                const code = doc.getText('code').toString();
                const language = roomInfo.language || 'cpp';
                
                const text = await generateReview(code, language);
                io.to(roomId).emit('AIReview', text);
            } catch (error) {
                // Log the real error so Render logs show the actual cause
                console.error('AI Review error [full]:', error.message, error.stack ?? '');

                // Send a specific, non-misleading message to the client
                let clientMsg;
                const msg = error.message ?? '';
                if (msg.includes('not configured') || msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
                    clientMsg = 'AI review is not configured on this server. Contact the administrator.';
                } else if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                    clientMsg = 'AI review quota exceeded. Please try again later.';
                } else if (msg.includes('model') || msg.includes('NOT_FOUND')) {
                    clientMsg = 'AI review model is unavailable. Contact the administrator.';
                } else {
                    clientMsg = 'AI review failed — please try again in a moment.';
                }
                io.to(roomId).emit('AIReview', clientMsg);
            }
        });

        socket.on('disconnect', async () => {
            if (currentRoom) {
                await removeUserFromRoom(io, socket, currentRoom);
            }
            lastAction.delete(socket.id);
            console.log('A user disconnected:', socket.user?.name);
        });
    });
};
