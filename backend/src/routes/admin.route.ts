import { Router } from "express";
import { listProviders, approveProvider, rejectProvider } from "../controllers/admin.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/role.middleware.js";
const router = Router();

// Note: We should check for admin role - implement a simple middleware here or inline check
router.get("/providers", requireAuth, requireAdmin, listProviders);
router.post("/providers/:id/approve", requireAuth, requireAdmin, approveProvider);
router.post("/providers/:id/reject", requireAuth, requireAdmin, rejectProvider);

export default router;
