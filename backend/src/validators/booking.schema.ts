import { z } from "zod";

const serviceModeSchema = z.enum(["video", "audio", "message", "in_person"]);
const paymentMethodSchema = z.enum(["cod", "proof_upload"]);
const bookingDocumentTypeSchema = z.enum([
  "prescription",
  "health_record",
  "payment_proof",
  "other",
]);

export const createBookingSchema = z
  .object({
    doctor_id: z.string().uuid().optional(),
    service_id: z.string().uuid(),
    availability_id: z.string().uuid().optional(),
    payment_method: paymentMethodSchema,
    scheduled_start: z.string().datetime(),
    scheduled_end: z.string().datetime(),
    patient_age: z.coerce.number().int().positive().optional(),
    symptoms: z.string().max(4000).optional(),
    booking_notes: z.string().max(4000).optional(),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.scheduled_start);
    const end = new Date(value.scheduled_end);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduled_end"],
        message: "scheduled_end must be after scheduled_start",
      });
    }
  });

export const listBookingsQuerySchema = z.object({
  type: z.enum(["upcoming", "past"]).optional(),
  status: z
    .enum([
      "pending_payment",
      "pending_confirmation",
      "confirmed",
      "completed",
      "cancelled",
      "no_show",
      "expired",
    ])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  service_mode: serviceModeSchema.optional(),
});

export const submitBookingPaymentSchema = z.object({
  payment_method: paymentMethodSchema,
  amount: z.coerce.number().nonnegative(),
  currency: z.string().min(3).max(3).default("ETB"),
  transaction_reference: z.string().max(255).optional(),
  proof_document_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const reviewBookingPaymentSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().max(1000).optional(),
});

export const addBookingDocumentBodySchema = z.object({
  document_type: bookingDocumentTypeSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  urls: z
    .array(
      z.object({
        file_url: z.string().url(),
        file_name: z.string().optional(),
        document_type: bookingDocumentTypeSchema.optional(),
      }),
    )
    .optional(),
});

export const bookingActionSchema = z.object({
  note: z.string().max(1000).optional(),
  reason: z.string().max(1000).optional(),
  scheduled_start: z.string().datetime().optional(),
  scheduled_end: z.string().datetime().optional(),
});

export const bookingJoinCheckQuerySchema = z.object({
  channel: z.enum(["message", "audio", "video"]),
});

export const adminBookingQueueQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  doctor_id: z.string().uuid().optional(),
  service_mode: serviceModeSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});
