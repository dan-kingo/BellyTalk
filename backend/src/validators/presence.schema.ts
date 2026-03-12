import { z } from "zod";

export const updatePresenceSchema = z.object({
  status: z.enum(["online", "offline", "away"]),
});

export const listDoctorsPresenceQuerySchema = z.object({
  ids: z.string().optional(),
});
