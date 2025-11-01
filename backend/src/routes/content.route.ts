import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createContent,
  getAllContent,
  getSingleContent,
  updateContent,
  deleteContent,
  translateContent,
  getMyContents,
} from "../controllers/content.controller.js";
import { contentSchema } from "../validators/content.schema.js";
import { uploadMiddleware } from "../controllers/upload.controller.js";

const router = Router();
router.post(
  "/",
  requireAuth,
  requireRole(["admin", "doctor", "counselor"]),
  uploadMiddleware.single("cover"),
  createContent
);

router.get("/", getAllContent);
router.get("/my-contents", requireAuth, getMyContents);
router.get("/:id", getSingleContent);
router.put("/:id", requireAuth, uploadMiddleware.single("cover"), updateContent);
router.delete("/:id", requireAuth, deleteContent);
router.post("/:id/translate", translateContent);

export default router;
