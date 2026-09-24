import * as Y from 'yjs';
import { Room } from '../../models/Room.model.js';
import { rooms, roomData, ydocs, parseSocketPayload, throttled } from '../state.js';
import { joinPayloadSchema } from '../schemas.js';
import { removeUserFromRoom } from '../persistence.js';

export function registerRoomHandlers(io, socket, ctx) {
  socket.on('join', async (payload) => {
    if (throttled(socket, 'join', 1000)) return;
    const parsed = parseSocketPayload(socket, joinPayloadSchema, payload);
    if (!parsed) return;
    const { roomId } = parsed;

    const dbRoom = await Room.findOne({ roomId });
    if (!dbRoom) {
      socket.emit('roomError', { message: 'Room not found' });
      return;
    }

    let roomInfo = roomData.get(roomId);
    if (!roomInfo) {
      roomInfo = {
        language: dbRoom.language,
        lastModifiedBy: dbRoom.lastModifiedBy,
        lastModifiedAt: dbRoom.lastModifiedAt,
      };
      roomData.set(roomId, roomInfo);
    }

    // If the socket was already in another room, leave it cleanly first.
    if (ctx.currentRoom) {
      socket.leave(ctx.currentRoom);
      await removeUserFromRoom(io, socket, ctx.currentRoom);
    }
    ctx.currentRoom = roomId;
    socket.join(roomId);

    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    rooms.get(roomId).set(socket.id, socket.user);

    const usersInRoom = Array.from(
      new Map(Array.from(rooms.get(roomId).values()).map((u) => [u.id, u])).values()
    );
    io.to(roomId).emit('userJoined', usersInRoom);

    // First joiner hydrates the Y.Doc from Mongo.
    if (!ydocs.has(roomId)) {
      const ydoc = new Y.Doc();
      if (dbRoom.ydocState) {
        Y.applyUpdate(ydoc, new Uint8Array(dbRoom.ydocState));
      } else if (dbRoom.code) {
        ydoc.getText('code').insert(0, dbRoom.code);
      } else {
        ydoc.getText('code').insert(0, '// start coding here...');
      }
      ydocs.set(roomId, ydoc);
    }

    socket.emit('yjs-sync', Y.encodeStateAsUpdate(ydocs.get(roomId)));

    socket.emit('codeUpdate', {
      lastModifiedBy: roomInfo.lastModifiedBy,
      lastModifiedAt: roomInfo.lastModifiedAt,
    });
    if (roomInfo.language) socket.emit('languageUpdate', roomInfo.language);
  });

  socket.on('leaveRoom', () => {
    if (!ctx.currentRoom) return;
    socket.leave(ctx.currentRoom);
    void removeUserFromRoom(io, socket, ctx.currentRoom);
    ctx.currentRoom = null;
  });
}
