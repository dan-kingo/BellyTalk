import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createGroup,
  listGroups,
  joinGroup,
  sendMessage,
  listMessages
} from "../controllers/groupchat.controller.js";

const router = Router();

router.post("/", requireAuth, createGroup);
router.get("/", requireAuth, listGroups);
router.post("/:roomId/join", requireAuth, joinGroup);
router.post("/:roomId/messages", requireAuth, sendMessage);
router.get("/:roomId/messages", requireAuth, listMessages);

export default router;
