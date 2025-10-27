import { Router } from "express";
import { listProviders, approveProvider, rejectProvider, approveRole, listRoleRequests, rejectRole } from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
const router = Router();

// Note: We should check for admin role - implement a simple middleware here or inline check
router.get("/providers", requireAuth, requireRole(["admin"]), listProviders);
router.post("/providers/:id/approve", requireAuth, requireRole(["admin"]), approveProvider);
router.post("/providers/:id/reject", requireAuth, requireRole(["admin"]), rejectProvider);
router.get("/roles/pending", requireAuth, requireRole(["admin"]), listRoleRequests);
router.post("/roles/:id/approve", requireAuth, requireRole(["admin"]), approveRole);
router.post("/roles/:id/reject", requireAuth, requireRole(["admin"]), rejectRole);

export default router;
