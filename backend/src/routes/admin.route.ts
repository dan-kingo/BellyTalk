import { Router } from "express";
import {
  listProviders,
  approveRole,
  rejectRole,
  listRoleRequests,
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/providers", requireAuth, requireRole(["admin"]), listProviders);
router.get(
  "/roles/pending",
  requireAuth,
  requireRole(["admin"]),
  listRoleRequests,
);
router.post(
  "/roles/:id/approve",
  requireAuth,
  requireRole(["admin"]),
  approveRole,
);
router.post(
  "/roles/:id/reject",
  requireAuth,
  requireRole(["admin"]),
  rejectRole,
);

// Backward-compatible aliases that intentionally use the canonical handlers.
router.post(
  "/providers/:id/approve",
  requireAuth,
  requireRole(["admin"]),
  approveRole,
);
router.post(
  "/providers/:id/reject",
  requireAuth,
  requireRole(["admin"]),
  rejectRole,
);

export default router;
