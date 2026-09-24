// In-memory collaborative state. These maps are the server's authoritative
// copy of every active room. Persisted state lives in MongoDB (see persistence.js).

export const rooms = new Map();            // roomId → Map<socketId, user>
export const roomData = new Map();         // roomId → { language, lastModifiedBy, lastModifiedAt }
export const ydocs = new Map();            // roomId → Y.Doc
export const lastAction = new Map();       // socketId → { [key]: timestamp }
export const saveTimeouts = new Map();     // roomId → timeout handle
export const roomCompileTime = new Map();  // roomId → last compile timestamp

// Per-socket rate limit. Different keys ('compile', 'review') don't interfere.
export function throttled(socket, key, cooldownMs) {
  const now = Date.now();
  const entry = lastAction.get(socket.id) || {};
  if (entry[key] && now - entry[key] < cooldownMs) return true;
  entry[key] = now;
  lastAction.set(socket.id, entry);
  return false;
}

// Validates an incoming payload. On failure, emits socketValidationError and
// returns null so the caller can bail early.
export function parseSocketPayload(socket, schema, payload) {
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
