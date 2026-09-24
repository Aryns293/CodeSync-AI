import { z } from 'zod';

export const languageSchema = z.enum(['cpp', 'python3', 'java', 'javascript']);

export const roomPayloadSchema = z.object({ roomId: z.string().uuid() });

export const joinPayloadSchema = roomPayloadSchema;

export const yjsUpdatePayloadSchema = roomPayloadSchema.extend({
  update: z.any().refine(
    (value) =>
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value) ||
      Array.isArray(value),
    'Invalid Yjs update payload'
  ),
  timestamp: z.string().datetime().optional(),
});

export const cursorPayloadSchema = roomPayloadSchema.extend({
  position: z.object({
    lineNumber: z.number().int().positive(),
    column: z.number().int().positive(),
  }),
});

export const languagePayloadSchema = roomPayloadSchema.extend({
  language: languageSchema,
});

export const compilePayloadSchema = roomPayloadSchema.extend({
  stdin: z.string().max(20_000).optional(),
});
