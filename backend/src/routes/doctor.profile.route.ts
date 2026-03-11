import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  getDoctorProfile,
  getMyDoctorProfile,
  listDoctorProfiles,
  upsertMyDoctorProfile,
} from "../controllers/doctor.profile.controller.js";
import {
  listDoctorProfilesQuerySchema,
  upsertDoctorProfileSchema,
} from "../validators/doctor.profile.schema.js";

const router = Router();

router.get(
  "/",
  validate(listDoctorProfilesQuerySchema, "query"),
  listDoctorProfiles,
);
router.get(
  "/me",
  requireAuth,
  requireRole(["doctor", "admin"]),
  getMyDoctorProfile,
);
router.post(
  "/me",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(upsertDoctorProfileSchema),
  upsertMyDoctorProfile,
);
router.put(
  "/me",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(upsertDoctorProfileSchema),
  upsertMyDoctorProfile,
);
router.get("/:doctorId", getDoctorProfile);

export default router;
