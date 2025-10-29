import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as VideoCtrl from "../controllers/video.controller.js";
import * as ChatCtrl from "../controllers/video.chat.controller.js";

const router = Router();

router.post("/create", requireAuth, VideoCtrl.createVideoSession);
router.post("/token", requireAuth, VideoCtrl.getVideoToken);
router.post("/end/:session_id", requireAuth, VideoCtrl.endVideoSession);

router.post("/chat/send", requireAuth, ChatCtrl.sendVideoMessage);
router.get("/chat/:session_id", requireAuth, ChatCtrl.listVideoMessages);

export default router;
