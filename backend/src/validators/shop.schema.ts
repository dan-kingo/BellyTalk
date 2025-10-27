import { z } from "zod";

export const productCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.preprocess((v) => Number(v), z.number().positive()),
  image_url: z.string().url().optional(),
  category: z.string().optional(),
  stock: z.preprocess((v) => Number(v ?? 0), z.number().int().nonnegative().default(0)),
  is_active: z.boolean().optional()
});

export const productUpdateSchema = productCreateSchema.partial();

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.preprocess((v) => Number(v ?? 1), z.number().int().positive().default(1))
});

export const createOrderSchema = z.object({
  // optional: create order from cart; allow override of shipping, etc.
  fromCart: z.boolean().optional().default(true),
  cartId: z.string().uuid().optional() // if creating from specific cart
});

export const mockPaymentSchema = z.object({
  orderId: z.string().uuid(),
  simulate: z.enum(["success", "fail"])
});
