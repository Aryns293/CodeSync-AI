import { runCode } from '../../services/execution.service.js';
import { generateReview } from '../../services/gemini.service.js';
import {
  rooms,
  roomData,
  ydocs,
  roomCompileTime,
  throttled,
  parseSocketPayload,
} from '../state.js';
import { compilePayloadSchema, roomPayloadSchema } from '../schemas.js';

export function registerExecutionHandlers(io, socket, ctx) {
  socket.on('compileCode', async (payload) => {
    const parsed = parseSocketPayload(socket, compilePayloadSchema, payload);
    if (!parsed) return;
    const { roomId, stdin } = parsed;
    if (roomId !== ctx.currentRoom) return;
    if (!rooms.has(roomId)) return;

    if (throttled(socket, 'compile', 3000)) {
      socket.emit('codeResponse', {
        run: { output: 'Slow down a little - please wait a couple seconds between runs.' },
      });
      return;
    }

    // Per-room cooldown so multiple users don't step on each other.
    const now = Date.now();
    const lastCompile = roomCompileTime.get(roomId);
    
    if (lastCompile === Infinity) {
      socket.emit('codeResponse', {
        run: { output: 'Room is busy — code is currently executing.' },
      });
      return;
    }
    
    if (now - (lastCompile ?? 0) < 5000) {
      socket.emit('codeResponse', {
        run: { output: 'Room is busy — someone just ran code. Wait a moment.' },
      });
      return;
    }
    
    roomCompileTime.set(roomId, Infinity); // Lock the room

    const roomInfo = roomData.get(roomId);
    const doc = ydocs.get(roomId);
    if (!roomInfo || !doc) {
      roomCompileTime.delete(roomId);
      return;
    }

    const code = doc.getText('code').toString();
    const language = roomInfo.language || 'cpp';

    try {
      const result = await runCode({
        language,
        code,
        stdin,
        roomId,
        userId: socket.user.id,
      });
      io.to(roomId).emit('codeResponse', { run: result });
    } finally {
      roomCompileTime.set(roomId, Date.now()); // Start cooldown after completion
    }
  });

  socket.on('getAIReview', async (payload) => {
    const parsed = parseSocketPayload(socket, roomPayloadSchema, payload);
    if (!parsed) return;
    const { roomId } = parsed;
    if (roomId !== ctx.currentRoom) return;

    if (throttled(socket, 'review', 8000)) {
      io.to(roomId).emit(
        'AIReview',
        'Please wait a few seconds before requesting another review.'
      );
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
      console.error('AI Review error [full]:', error.message, error.stack ?? '');

      // Map the underlying error to something useful for the user — the raw
      // SDK message often leaks upstream provider details that aren't actionable.
      const msg = error.message ?? '';
      let clientMsg;
      if (
        msg.includes('not configured') ||
        msg.includes('API key not valid') ||
        msg.includes('API_KEY_INVALID')
      ) {
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
}
