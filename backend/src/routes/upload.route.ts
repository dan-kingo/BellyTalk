import { Router } from "express";
import { getUploadSignature } from "../controllers/upload.controller.js";
import { uploadFile, uploadMiddleware } from "../controllers/upload.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/sign", requireAuth, getUploadSignature);
router.post("/upload", requireAuth, uploadMiddleware.single("file"), uploadFile);

export default router;
