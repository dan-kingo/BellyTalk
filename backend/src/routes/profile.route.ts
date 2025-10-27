import { Router } from "express";
import { getMe, updateMe, requestRoleUpgrade } from "../controllers/profile.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/me", requireAuth, getMe);
import { uploadMiddleware } from "../controllers/upload.controller.js";

router.put(
  "/me",
  requireAuth,
  uploadMiddleware.single("avatar"), 
  updateMe
);
router.post(
  "/request-role-upgrade",
  requireAuth,
  uploadMiddleware.array("documents", 5), 
  requestRoleUpgrade
);

export default router;
