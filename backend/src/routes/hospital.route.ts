import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createHospital,
  getHospitals,
  updateHospital,
  deleteHospital,
  getMyHospitals,
} from "../controllers/hospital.controller.js";
import { hospitalSchema } from "../validators/hospital.schema.js";

const router = Router();

router.get("/", getHospitals);
router.get("/my-hospitals", requireAuth, getMyHospitals);
router.post("/", requireAuth, requireRole(["doctor", "counselor", "admin"]), validate(hospitalSchema), createHospital);
router.put("/:id", requireAuth, requireRole(["doctor", "counselor", "admin"]), validate(hospitalSchema.partial()), updateHospital);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteHospital);

export default router;
