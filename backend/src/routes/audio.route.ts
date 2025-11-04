// src/routes/audio.route.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as AudioCtrl from "../controllers/audio.controller.js";

const router = Router();

router.post("/create", requireAuth, AudioCtrl.createSession);
router.post("/token", requireAuth, AudioCtrl.getAuthToken);
router.post("/end/:session_id", requireAuth, AudioCtrl.endSession);
router.get('/session/:session_id',requireAuth,AudioCtrl.getSession); 

export default router;
