import * as Y from 'yjs';
import { ydocs, roomData, parseSocketPayload } from '../state.js';
import {
  yjsUpdatePayloadSchema,
  cursorPayloadSchema,
  languagePayloadSchema,
  roomPayloadSchema,
} from '../schemas.js';
import { scheduleDbSave } from '../persistence.js';

export function registerCollaborationHandlers(io, socket, ctx) {
  socket.on('yjs-update', (payload, callback) => {
    const parsed = parseSocketPayload(socket, yjsUpdatePayloadSchema, payload);
    if (!parsed) {
      if (typeof callback === 'function') callback({ error: 'Validation failed' });
      return;
    }
    const { roomId, update, timestamp } = parsed;
    if (roomId !== ctx.currentRoom) {
      if (typeof callback === 'function') callback({ error: 'Wrong room' });
      return;
    }

    const doc = ydocs.get(roomId);
    if (!doc) {
      if (typeof callback === 'function') callback({ error: 'Doc missing' });
      return;
    }

    try {
      Y.applyUpdate(doc, new Uint8Array(update));
      socket.to(roomId).emit('yjs-update', { update });

      const userName = socket.user.name;
      const modifiedAt = timestamp || new Date().toISOString();
      socket.to(roomId).emit('codeUpdate', {
        lastModifiedBy: userName,
        lastModifiedAt: modifiedAt,
      });

      if (!roomData.has(roomId)) roomData.set(roomId, {});
      roomData.get(roomId).lastModifiedBy = userName;
      roomData.get(roomId).lastModifiedAt = modifiedAt;

      scheduleDbSave(roomId);
    } catch (error) {
      console.error(
        `[Yjs] Failed to apply update from socket ${socket.id} in room ${roomId}:`,
        error.message
      );
      socket.emit('error', 'Malformed document update received');
    }
    if (typeof callback === 'function') callback();
  });

  socket.on('typing', (payload) => {
    const parsed = parseSocketPayload(socket, roomPayloadSchema, payload);
    if (!parsed || parsed.roomId !== ctx.currentRoom) return;
    socket.to(parsed.roomId).emit('userTyping', {
      userName: socket.user.name,
      userId: socket.user.id,
    });
  });

  socket.on('cursorChange', (payload) => {
    const parsed = parseSocketPayload(socket, cursorPayloadSchema, payload);
    if (!parsed || parsed.roomId !== ctx.currentRoom) return;
    socket.to(parsed.roomId).emit('cursorUpdate', {
      userId: socket.user.id,
      userName: socket.user.name,
      position: parsed.position,
    });
  });

  socket.on('languageChange', (payload) => {
    const parsed = parseSocketPayload(socket, languagePayloadSchema, payload);
    if (!parsed) return;
    const { roomId, language } = parsed;
    if (roomId !== ctx.currentRoom) return;

    io.to(roomId).emit('languageUpdate', language);
    if (!roomData.has(roomId)) roomData.set(roomId, {});
    roomData.get(roomId).language = language;
    scheduleDbSave(roomId);
  });
}
