import { Router } from "express";
import { getUploadSignature } from "../controllers/upload.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/sign", requireAuth, getUploadSignature);

export default router;
