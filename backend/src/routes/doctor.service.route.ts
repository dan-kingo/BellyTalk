import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createDoctorService,
  createServiceAvailability,
  deleteDoctorService,
  deleteServiceAvailability,
  listDoctorServices,
  listMyDoctorServices,
  listServiceAvailability,
  updateDoctorService,
  updateServiceAvailability,
} from "../controllers/doctor.service.controller.js";
import {
  createAvailabilitySchema,
  createDoctorServiceSchema,
  listDoctorServicesQuerySchema,
  updateAvailabilitySchema,
  updateDoctorServiceSchema,
} from "../validators/doctor.service.schema.js";

const router = Router();

router.get(
  "/",
  validate(listDoctorServicesQuerySchema, "query"),
  listDoctorServices,
);
router.get(
  "/my",
  requireAuth,
  requireRole(["doctor", "admin"]),
  listMyDoctorServices,
);
router.post(
  "/",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(createDoctorServiceSchema),
  createDoctorService,
);
router.put(
  "/:id",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(updateDoctorServiceSchema),
  updateDoctorService,
);
router.delete(
  "/:id",
  requireAuth,
  requireRole(["doctor", "admin"]),
  deleteDoctorService,
);

router.get("/:serviceId/availability", listServiceAvailability);
router.post(
  "/:serviceId/availability",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(createAvailabilitySchema),
  createServiceAvailability,
);
router.put(
  "/availability/:availabilityId",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(updateAvailabilitySchema),
  updateServiceAvailability,
);
router.delete(
  "/availability/:availabilityId",
  requireAuth,
  requireRole(["doctor", "admin"]),
  deleteServiceAvailability,
);

export default router;
