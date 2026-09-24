import { socketAuth } from './auth.js';
import { lastAction } from './state.js';
import { removeUserFromRoom } from './persistence.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerCollaborationHandlers } from './handlers/collaboration.handler.js';
import { registerExecutionHandlers } from './handlers/execution.handler.js';

export function setupSocketHandlers(io) {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id, '→', socket.user.name);

    // Personal room so logout can force-disconnect every tab/device.
    socket.join(`user:${socket.user.id}`);

    // Shared context for handlers. Keeping `currentRoom` in one object means
    // each handler doesn't need to track which room this socket belongs to.
    const ctx = { currentRoom: null };

    registerRoomHandlers(io, socket, ctx);
    registerCollaborationHandlers(io, socket, ctx);
    registerExecutionHandlers(io, socket, ctx);

    socket.on('disconnect', async () => {
      if (ctx.currentRoom) {
        await removeUserFromRoom(io, socket, ctx.currentRoom);
      }
      lastAction.delete(socket.id);
      console.log('A user disconnected:', socket.user?.name);
    });
  });
}
