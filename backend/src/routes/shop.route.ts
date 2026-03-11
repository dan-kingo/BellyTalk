import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import * as ProductCtrl from "../controllers/product.controller.js";
import * as CartCtrl from "../controllers/cart.controller.js";
import * as OrderCtrl from "../controllers/order.controller.js";
import {
  productCreateSchema,
  productUpdateSchema,
  addToCartSchema,
  createOrderSchema,
  submitOrderPaymentSchema,
  reviewOrderPaymentSchema,
} from "../validators/shop.schema.js";
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
  requireRole(["admin", "doctor", "counselor"]),
  uploadMiddleware.single("file"), // 👈 this allows product image upload
  validate(productCreateSchema),
  ProductCtrl.createProduct,
);
router.get("/my-products", requireAuth, ProductCtrl.getMyProducts);

router.put(
  "/products/:id",
  requireAuth,
  requireRole(["admin", "doctor", "counselor"]),
  uploadMiddleware.single("file"),
  validate(productUpdateSchema),
  ProductCtrl.updateProduct,
);

router.delete(
  "/products/:id",
  requireAuth,
  requireRole(["admin", "doctor", "counselor"]),
  ProductCtrl.deleteProduct,
);
/* Cart */
router.get("/cart", requireAuth, CartCtrl.getCart);
router.post(
  "/cart/items",
  requireAuth,
  validate(addToCartSchema),
  CartCtrl.addToCart,
);
router.delete("/cart/items/:itemId", requireAuth, CartCtrl.removeFromCart);

/* Orders */
router.post(
  "/orders",
  requireAuth,
  uploadMiddleware.single("payment_document"),
  validate(createOrderSchema),
  OrderCtrl.createOrder,
);
router.post(
  "/orders/:orderId/payment",
  requireAuth,
  uploadMiddleware.single("payment_document"),
  validate(submitOrderPaymentSchema),
  OrderCtrl.processPayment,
);
router.patch(
  "/orders/:id/payment/review",
  requireAuth,
  requireRole(["admin", "doctor", "counselor"]),
  validate(reviewOrderPaymentSchema),
  OrderCtrl.reviewOrderPayment,
);
router.get("/orders", requireAuth, OrderCtrl.listOrders);
router.get("/my-orders", requireAuth, OrderCtrl.getMyOrders);
router.get("/orders/:id", requireAuth, OrderCtrl.getOrder);
router.put("/orders/:id/status", requireAuth, OrderCtrl.updateOrderStatus);
router.post("/orders/:id/cancel", requireAuth, OrderCtrl.cancelOrder);

export default router;
