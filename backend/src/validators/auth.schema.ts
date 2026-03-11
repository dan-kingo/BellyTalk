import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token_hash: z.string().min(10),
  new_password: passwordSchema,
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordSchema,
});
