import { z } from "zod";

export const contentSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(10),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().default("en"),
  cover_url: z.string().url().optional(),
  is_published: z.boolean().optional(),
});
