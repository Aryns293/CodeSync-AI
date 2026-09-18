import jwt from 'jsonwebtoken';
import { runCode } from './execution.service.js';
import { generateReview } from './gemini.service.js';
import { Room } from '../models/Room.model.js';
import { User } from '../models/User.model.js';
import * as Y from 'yjs';

const rooms = new Map();
const roomData = new Map();
const ydocs = new Map();
const lastAction = new Map();
const saveTimeouts = new Map();

// ─── Cleanup when a room becomes empty ────────────────────────────────────────
// Fix #13: Without this, rooms/roomData Maps grow forever on a long-running server.
function cleanupRoomIfEmpty(roomId) {
    const roomUsers = rooms.get(roomId);
    if (!roomUsers || roomUsers.size > 0) return;

    // Cancel any pending DB save for this room before clearing it
    if (saveTimeouts.has(roomId)) {
        clearTimeout(saveTimeouts.get(roomId));
        saveTimeouts.delete(roomId);
    }

    rooms.delete(roomId);
    roomData.delete(roomId);
    ydocs.delete(roomId);
}

function scheduleDbSave(roomId) {
    if (saveTimeouts.has(roomId)) {
        clearTimeout(saveTimeouts.get(roomId));
    }
    
    saveTimeouts.set(roomId, setTimeout(async () => {
        saveTimeouts.delete(roomId);
        const data = roomData.get(roomId);
        const ydoc = ydocs.get(roomId);
        
        if (data || ydoc) {
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
                    await Room.findOneAndUpdate({ roomId }, updateQuery, { upsert: true });
                }
            } catch (error) {
                console.error(`Error saving room ${roomId} to DB:`, error);
            }
        }
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

// ─── Helper: remove a user from a room and notify others ─────────────────────
function removeUserFromRoom(io, socket, roomId) {
    rooms.get(roomId)?.delete(socket.id);
    const usersInRoom = Array.from(
        new Map(
            Array.from(rooms.get(roomId)?.values() || []).map((u) => [u.id, u])
        ).values()
    );
    io.to(roomId).emit('userJoined', usersInRoom);
    cleanupRoomIfEmpty(roomId);
}

export const setupSocketHandlers = (io) => {
    // ─── Fix #8: Socket.IO auth middleware ────────────────────────────────────
    // Runs before any event handler. Verifies the JWT from the httpOnly cookie.
    // Unauthenticated connections are rejected here before they can touch any room data.
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.headers.cookie
                ?.split(';')
                .map((c) => c.trim())
                .find((c) => c.startsWith('jwt='))
                ?.split('=')[1];

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

        let currentRoom = null;

        socket.on('join', async ({ roomId }) => {
            // Fix #8: user identity comes from socket.user (server-verified), not the client payload.
            const user = socket.user;

            if (currentRoom) {
                socket.leave(currentRoom);
                removeUserFromRoom(io, socket, currentRoom);
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

            // Fetch from DB if not in memory
            let roomInfo = roomData.get(roomId);
            let dbRoom = null;
            if (!roomInfo) {
                dbRoom = await Room.findOne({ roomId });
                if (dbRoom) {
                    roomInfo = {
                        language: dbRoom.language,
                        lastModifiedBy: dbRoom.lastModifiedBy,
                        lastModifiedAt: dbRoom.lastModifiedAt,
                    };
                    roomData.set(roomId, roomInfo);
                }
            }
            
            // Hydrate Y.Doc if not present in memory
            if (!ydocs.has(roomId)) {
                const ydoc = new Y.Doc();
                if (dbRoom && dbRoom.ydocState) {
                    Y.applyUpdate(ydoc, new Uint8Array(dbRoom.ydocState));
                } else if (dbRoom && dbRoom.code) {
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

        socket.on('yjs-update', ({ roomId, update, timestamp }, callback) => {
            const doc = ydocs.get(roomId);
            if (!doc) return;

            // Apply binary update to authoritative server doc
            Y.applyUpdate(doc, new Uint8Array(update));
            
            // Rebroadcast to everyone else in the room
            socket.to(roomId).emit('yjs-update', { update });

            const userName = socket.user.name;
            socket.to(roomId).emit('codeUpdate', { lastModifiedBy: userName, lastModifiedAt: timestamp });
            
            if (!roomData.has(roomId)) roomData.set(roomId, {});
            roomData.get(roomId).lastModifiedBy = userName;
            roomData.get(roomId).lastModifiedAt = timestamp;

            scheduleDbSave(roomId);
            if (typeof callback === 'function') callback();
        });

        socket.on('leaveRoom', () => {
            if (currentRoom) {
                socket.leave(currentRoom);
                removeUserFromRoom(io, socket, currentRoom);
                currentRoom = null;
            }
        });

        socket.on('typing', ({ roomId }) => {
            socket.to(roomId).emit('userTyping', { userName: socket.user.name, userId: socket.user.id });
        });

        socket.on('cursorChange', ({ roomId, position }) => {
            socket.to(roomId).emit('cursorUpdate', {
                userId: socket.user.id,
                userName: socket.user.name,
                position,
            });
        });

        socket.on('languageChange', ({ roomId, language }) => {
            io.to(roomId).emit('languageUpdate', language);
            if (!roomData.has(roomId)) roomData.set(roomId, {});
            roomData.get(roomId).language = language;
            scheduleDbSave(roomId);
        });

        socket.on('compileCode', async ({ roomId, stdin }) => {
            if (!rooms.has(roomId)) return;

            if (throttled(socket, 'compile', 3000)) {
                socket.emit('codeResponse', {
                    run: { output: 'Slow down a little - please wait a couple seconds between runs.' },
                });
                return;
            }

            const roomInfo = roomData.get(roomId);
            const doc = ydocs.get(roomId);
            if (!roomInfo || !doc) return;
            const code = doc.getText('code').toString();
            const language = roomInfo.language || 'cpp';

            const result = await runCode({ language, code, stdin, roomId, userId: socket.user.id });
            socket.emit('codeResponse', { run: result });
        });

        socket.on('getAIReview', async ({ roomId }) => {
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

        socket.on('disconnect', () => {
            if (currentRoom) {
                removeUserFromRoom(io, socket, currentRoom);
            }
            lastAction.delete(socket.id);
            console.log('A user disconnected:', socket.user?.name);
        });
    });
};
