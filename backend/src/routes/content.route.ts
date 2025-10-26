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
} from "../controllers/content.controller.js";
import { contentSchema } from "../validators/content.schema.js";

const router = Router();

router.get("/", getAllContent);
router.get("/:id", getSingleContent);
router.post("/", requireAuth, requireRole(["doctor", "counselor", "admin"]), validate(contentSchema), createContent);
router.put("/:id", requireAuth, requireRole(["doctor", "counselor", "admin"]), validate(contentSchema.partial()), updateContent);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteContent);

// Translate route (optional)
router.post("/:id/translate", requireAuth, translateContent);

export default router;
