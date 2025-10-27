import { z } from "zod";

/**
 * For cursor-based pagination we only need `limit`, `before`, `after`.
 * Make them optional and coerce numbers only when present.
 */
export const createConversationSchema = z.object({
  participantId: z.string().uuid()
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().optional(), // content optional if attachments present
  metadata: z.string().optional() // JSON string if used
});

/**
 * Query schema for messages: limit optional (coerced if provided),
 * before/after are ISO timestamp strings (optional).
 */
export const getMessagesQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return Number(val);
  }, z.number().int().positive().optional()),
  before: z.string().optional(),
  after: z.string().optional()
});
