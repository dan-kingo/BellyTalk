import { z } from "zod";

export const hospitalSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().default("Ethiopia"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  languages: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});
