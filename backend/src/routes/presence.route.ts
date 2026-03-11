import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  listDoctorsPresence,
  updateMyPresence,
} from "../controllers/presence.controller.js";
import {
  listDoctorsPresenceQuerySchema,
  updatePresenceSchema,
} from "../validators/presence.schema.js";

const router = Router();

router.put(
  "/me",
  requireAuth,
  validate(updatePresenceSchema),
  updateMyPresence,
);
router.get(
  "/doctors",
  requireAuth,
  validate(listDoctorsPresenceQuerySchema, "query"),
  listDoctorsPresence,
);

export default router;
