import * as Y from 'yjs';
import { Room } from '../models/Room.model.js';
import { rooms, roomData, ydocs, saveTimeouts, roomCompileTime } from './state.js';

export async function persistRoomState(
  roomId,
  data = roomData.get(roomId),
  ydoc = ydocs.get(roomId)
) {
  if (!data && !ydoc) return;

  try {
    const update = { $set: {} };

    if (data) {
      if (data.language !== undefined) update.$set.language = data.language;
      if (data.lastModifiedBy !== undefined) update.$set.lastModifiedBy = data.lastModifiedBy;
      if (data.lastModifiedAt !== undefined) update.$set.lastModifiedAt = data.lastModifiedAt;
    }

    if (ydoc) {
      update.$set.ydocState = Buffer.from(Y.encodeStateAsUpdate(ydoc));
      update.$set.code = ydoc.getText('code').toString();
    }

    if (Object.keys(update.$set).length > 0) {
      await Room.findOneAndUpdate({ roomId }, update);
    }
  } catch (error) {
    console.error(`Error saving room ${roomId} to DB:`, error);
  }
}

// Debounce so a burst of keystrokes turns into one Mongo write.
export function scheduleDbSave(roomId) {
  if (saveTimeouts.has(roomId)) {
    clearTimeout(saveTimeouts.get(roomId));
  }
  saveTimeouts.set(
    roomId,
    setTimeout(async () => {
      saveTimeouts.delete(roomId);
      await persistRoomState(roomId);
    }, 2000)
  );
}

// Flush final state and drop all in-memory entries once the room is empty.
async function cleanupRoomIfEmpty(roomId) {
  const users = rooms.get(roomId);
  if (!users || users.size > 0) return;

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

// Remove the socket from the room, re-broadcast the user list, and clean up
// if the room is now empty.
export async function removeUserFromRoom(io, socket, roomId) {
  rooms.get(roomId)?.delete(socket.id);

  const usersInRoom = Array.from(
    new Map(Array.from(rooms.get(roomId)?.values() || []).map((u) => [u.id, u])).values()
  );

  io.to(roomId).emit('userJoined', usersInRoom);
  await cleanupRoomIfEmpty(roomId);
}
