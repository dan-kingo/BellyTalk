import { z } from "zod";

export const upsertDoctorProfileSchema = z.object({
  headline: z.string().max(160).optional(),
  bio: z.string().max(5000).optional(),
  specialties: z.array(z.string().min(1)).optional(),
  languages: z.array(z.string().min(1)).optional(),
  years_of_experience: z.coerce.number().int().nonnegative().optional(),
  hospital_affiliation: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateDoctorProfileSchema = upsertDoctorProfileSchema.partial();

export const listDoctorProfilesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  verification_status: z.enum(["pending", "approved", "rejected"]).optional(),
  specialty: z.string().optional(),
});
