import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { createConversation, listConversations, getMessages, sendMessage, markMessagesSeen, getUnreadCount, searchUsers } from "../controllers/chat.controller.js";
import { createConversationSchema, getMessagesQuery } from "../validators/chat.schema.js";
import { uploadMiddleware } from "../controllers/upload.controller.js"; // existing
import { validate } from "../middlewares/validation.middleware.js";

const router = Router();

router.post("/conversations", requireAuth, validate(createConversationSchema), createConversation);
router.get("/conversations", requireAuth, listConversations);
router.get("/users/search", requireAuth, searchUsers);
router.get("/unread-count", requireAuth, getUnreadCount);

// GET messages: cursor-based (query params: limit, before, after)
router.get("/conversations/:conversationId/messages", requireAuth, validate(getMessagesQuery, "query"), getMessages);

// POST message (multipart/form-data): fields: conversationId, content; files: attachments[]
router.post("/messages", requireAuth, uploadMiddleware.array("attachments", 5), sendMessage);

router.post("/conversations/:conversationId/seen", requireAuth, markMessagesSeen);

export default router;
