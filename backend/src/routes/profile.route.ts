import { Router } from "express";
import { getMe, updateMe, requestRoleUpgrade } from "../controllers/profile.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);
router.post("/request-role-upgrade", requireAuth, requestRoleUpgrade);

export default router;
