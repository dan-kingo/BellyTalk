import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import * as ProductCtrl from "../controllers/product.controller.js";
import * as CartCtrl from "../controllers/cart.controller.js";
import * as OrderCtrl from "../controllers/order.controller.js";
import * as PaymentCtrl from "../controllers/payment.controller.js";
import { productCreateSchema, productUpdateSchema, addToCartSchema, createOrderSchema, mockPaymentSchema } from "../validators/shop.schema.js";
import { validate } from "../middlewares/validation.middleware.js";
import { uploadMiddleware } from "../controllers/upload.controller.js";

const router = Router();

/* Public */
router.get("/products", ProductCtrl.listProducts);
router.get("/products/:id", ProductCtrl.getProduct);

/* Admin with upload */
router.post(
  "/products",
  requireAuth,
  requireRole(["admin"]),
  uploadMiddleware.single("file"), // 👈 this allows product image upload
  validate(productCreateSchema),
  ProductCtrl.createProduct
);

router.put(
  "/products/:id",
  requireAuth,
  requireRole(["admin"]),
  uploadMiddleware.single("file"),
  validate(productUpdateSchema),
  ProductCtrl.updateProduct
);

router.delete(
  "/products/:id",
  requireAuth,
  requireRole(["admin"]),
  ProductCtrl.deleteProduct
);
/* Cart */
router.get("/cart", requireAuth, CartCtrl.getCart);
router.post("/cart/items", requireAuth, validate(addToCartSchema), CartCtrl.addToCart);
router.delete("/cart/items/:itemId", requireAuth, CartCtrl.removeFromCart);

/* Orders */
router.post("/orders", requireAuth, validate(createOrderSchema), OrderCtrl.createOrder);
router.get("/orders", requireAuth, OrderCtrl.listOrders);
router.get("/orders/:id", requireAuth, OrderCtrl.getOrder);

/* Mock Payments */
router.post("/payments/mock", requireAuth, validate(mockPaymentSchema), PaymentCtrl.simulatePayment);
router.post("/payments/mock/webhook", PaymentCtrl.mockPaymentWebhook);


export default router;
