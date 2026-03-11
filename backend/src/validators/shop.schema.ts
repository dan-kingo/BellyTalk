import { z } from "zod";

export const productCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.preprocess((v) => Number(v), z.number().positive()),
  image_url: z.string().url().optional(),
  category: z.string().optional(),
  stock: z.preprocess(
    (v) => Number(v ?? 0),
    z.number().int().nonnegative().default(0),
  ),
  is_active: z.boolean().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.preprocess(
    (v) => Number(v ?? 1),
    z.number().int().positive().default(1),
  ),
});

export const createOrderSchema = z.object({
  shipping_address: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    },
    z.object({
      address: z.string().min(1),
      city: z.string().min(1),
      country: z.string().min(1),
      region: z.string().optional(),
      postal_code: z.string().optional(),
    }),
  ),
  notes: z.string().max(1000).optional(),
  payment_method: z.enum(["cod", "proof_upload"]),
  payment_document_url: z.string().url().optional(),
  transaction_reference: z.string().max(255).optional(),
});

export const submitOrderPaymentSchema = z.object({
  payment_method: z.enum(["cod", "proof_upload"]).optional(),
  payment_document_url: z.string().url().optional(),
  transaction_reference: z.string().max(255).optional(),
});

export const reviewOrderPaymentSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().max(1000).optional(),
});
