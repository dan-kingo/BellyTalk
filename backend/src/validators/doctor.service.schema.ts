import { z } from "zod";

const serviceModeSchema = z.enum(["video", "audio", "message", "in_person"]);

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const createDoctorServiceSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  service_mode: serviceModeSchema,
  duration_minutes: z.coerce.number().int().positive(),
  price_amount: z.coerce.number().nonnegative(),
  currency: z.string().min(3).max(3).default("ETB"),
  booking_buffer_minutes: z.coerce.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateDoctorServiceSchema = createDoctorServiceSchema.partial();

const availabilityBaseSchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6).optional(),
  specific_date: z.string().date().optional(),
  start_time: z.string().regex(timeRegex, "Invalid start_time format"),
  end_time: z.string().regex(timeRegex, "Invalid end_time format"),
  timezone: z.string().min(1).default("UTC"),
  slot_capacity: z.coerce.number().int().positive().default(1),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const createAvailabilitySchema = availabilityBaseSchema.superRefine(
  (value, ctx) => {
    const hasDay = value.day_of_week !== undefined;
    const hasDate = value.specific_date !== undefined;

    if (hasDay === hasDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either day_of_week or specific_date",
        path: ["day_of_week"],
      });
    }
  },
);

export const updateAvailabilitySchema = availabilityBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (value.day_of_week !== undefined && value.specific_date !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide only one of day_of_week or specific_date",
        path: ["day_of_week"],
      });
    }
  });

export const listDoctorServicesQuerySchema = z.object({
  doctor_id: z.string().uuid().optional(),
  service_mode: serviceModeSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const listServiceSlotsQuerySchema = z.object({
  lookahead_days: z.coerce.number().int().min(1).max(60).optional(),
});
