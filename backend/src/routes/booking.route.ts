import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { uploadMiddleware } from "../controllers/upload.controller.js";
import {
  addBookingDocuments,
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBooking,
  getBooking,
  joinCheck,
  listDoctorBookings,
  listMyBookings,
  reviewBookingPayment,
  submitBookingPayment,
} from "../controllers/booking.controller.js";
import {
  addBookingDocumentBodySchema,
  bookingActionSchema,
  bookingJoinCheckQuerySchema,
  createBookingSchema,
  listBookingsQuerySchema,
  reviewBookingPaymentSchema,
  submitBookingPaymentSchema,
} from "../validators/booking.schema.js";

const router = Router();

router.post("/", requireAuth, validate(createBookingSchema), createBooking);
router.get(
  "/my",
  requireAuth,
  validate(listBookingsQuerySchema, "query"),
  listMyBookings,
);
router.get(
  "/doctor",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(listBookingsQuerySchema, "query"),
  listDoctorBookings,
);
router.get("/:id", requireAuth, getBooking);
router.get(
  "/:id/join-check",
  requireAuth,
  validate(bookingJoinCheckQuerySchema, "query"),
  joinCheck,
);

router.patch(
  "/:id/confirm",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(bookingActionSchema),
  confirmBooking,
);
router.patch(
  "/:id/cancel",
  requireAuth,
  validate(bookingActionSchema),
  cancelBooking,
);
router.patch(
  "/:id/complete",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(bookingActionSchema),
  completeBooking,
);

router.post(
  "/:id/documents",
  requireAuth,
  uploadMiddleware.array("files", 5),
  validate(addBookingDocumentBodySchema),
  addBookingDocuments,
);

router.post(
  "/:id/payments",
  requireAuth,
  validate(submitBookingPaymentSchema),
  submitBookingPayment,
);
router.patch(
  "/:id/payments/:paymentId/review",
  requireAuth,
  requireRole(["doctor", "admin"]),
  validate(reviewBookingPaymentSchema),
  reviewBookingPayment,
);

export default router;
