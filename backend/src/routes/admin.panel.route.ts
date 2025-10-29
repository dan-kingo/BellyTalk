import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { getOverview, listUsers, deleteUser, getLogs } from "../controllers/admin.panel.controller.js";

const router = Router();

router.get("/overview", requireAuth, requireRole(["admin"]), getOverview);
router.get("/users", requireAuth, requireRole(["admin"]), listUsers);
router.delete("/users/:id", requireAuth, requireRole(["admin"]), deleteUser);
router.get("/logs", requireAuth, requireRole(["admin"]), getLogs);

export default router;
