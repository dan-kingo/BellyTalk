import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { uploadFile } from "./upload.controller.js";

type PaymentMethod = "cod" | "proof_upload";

const uploadBufferToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
) => {
  const fakeReq = {
    file,
    body: { folder },
  } as unknown as Request;

  const result = await new Promise<any>((resolve, reject) => {
    try {
      (uploadFile as any)(fakeReq, {
        status: (_: number) => ({ json: (d: any) => resolve(d) }),
      } as any);
    } catch (e) {
      reject(e);
    }
  });

  return result?.result || null;
};

const decrementStockForOrder = async (orderId: string) => {
  const { data: orderItems, error } = await supabaseAdmin
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (error) throw error;

  for (const item of orderItems || []) {
    await supabaseAdmin.rpc("decrement_product_stock", {
      product_id: item.product_id,
      decrement_by: item.quantity,
    });
  }
};

const getPaymentProofUrl = async (req: AuthRequest, orderId: string) => {
  const directUrl = req.body.payment_document_url;
  if (directUrl) return String(directUrl);

  const file = req.file as Express.Multer.File | undefined;
  if (!file) return null;

  const uploaded = await uploadBufferToCloudinary(
    file,
    `bellytalk/orders/${orderId}/payment-proof`,
  );

  return uploaded?.secure_url || null;
};

const canReviewOrderPayment = async (userId: string, orderId: string) => {
  const [{ data: profile }, { data: order }] = await Promise.all([
    supabaseAdmin.from("profiles").select("role").eq("id", userId).single(),
    supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (created_by)
        )
      `,
      )
      .eq("id", orderId)
      .maybeSingle(),
  ]);

  if (!order) {
    return { ok: false as const, status: 404, error: "Order not found" };
  }

  const isAdmin = profile?.role === "admin";
  const isDoctor = profile?.role === "doctor";
  const isProductOwner = (order.order_items || []).some(
    (item: any) => item?.products?.created_by === userId,
  );

  if (!isAdmin && !isDoctor && !isProductOwner) {
    return {
      ok: false as const,
      status: 403,
      error: "Forbidden",
    };
  }

  return { ok: true as const, order };
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { shipping_address, notes, payment_method } = req.body as {
      shipping_address: any;
      notes?: string;
      payment_method: PaymentMethod;
    };

    if (
      !shipping_address ||
      !shipping_address.address ||
      !shipping_address.city ||
      !shipping_address.country
    ) {
      return res
        .status(400)
        .json({ error: "Complete shipping address is required" });
    }

    if (!["cod", "proof_upload"].includes(String(payment_method))) {
      return res.status(400).json({ error: "Invalid payment_method" });
    }

    const { data: cart } = await supabaseAdmin
      .from("carts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!cart) return res.status(400).json({ error: "No cart found" });

    const { data: items } = await supabaseAdmin
      .from("cart_items")
      .select(
        `
        product_id,
        quantity,
        products!inner(title, price, stock, created_by)
      `,
      )
      .eq("cart_id", cart.id);

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const insufficient = items.filter(
      (i: any) => i.products?.stock < i.quantity,
    );
    if (insufficient.length) {
      return res.status(400).json({
        error: "Insufficient stock",
        items: insufficient.map((i: any) => ({
          product_id: i.product_id,
          product_title: i.products?.title,
          available: i.products?.stock || 0,
          requested: i.quantity,
        })),
      });
    }

    let total = 0;
    const orderItems = items.map((it: any) => {
      const price = Number(it.products.price);
      const qty = Number(it.quantity);
      total += price * qty;
      return {
        product_id: it.product_id,
        quantity: qty,
        unit_price: price,
      };
    });

    const initialPaymentStatus =
      payment_method === "cod" ? "unpaid" : "pending_review";
    const initialOrderStatus =
      payment_method === "cod" ? "confirmed" : "pending";

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          user_id: userId,
          total_price: total,
          payment_status: initialPaymentStatus,
          order_status: initialOrderStatus,
          payment_method,
          shipping_address,
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    const paymentProofUrl = await getPaymentProofUrl(req, order.id);

    if (payment_method === "proof_upload" && !paymentProofUrl) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return res.status(400).json({
        error:
          "payment proof is required for proof_upload (payment_document file or payment_document_url)",
      });
    }

    if (paymentProofUrl) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_document_url: paymentProofUrl,
          payment_submitted_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    }

    const orderItemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsWithOrderId);

    if (itemsError) throw itemsError;

    if (payment_method === "cod") {
      await decrementStockForOrder(order.id);
    }

    await supabaseAdmin.from("cart_items").delete().eq("cart_id", cart.id);

    const { data: completeOrder } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `,
      )
      .eq("id", order.id)
      .single();

    return res.status(201).json({
      order: completeOrder,
      message:
        payment_method === "cod"
          ? "Order created with COD."
          : "Order created. Payment proof submitted for review.",
    });
  } catch (err: any) {
    console.error("createOrder error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Replaces mock payment processing with real proof/COD handling.
export const processPayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;
    const { payment_method, payment_document_url, transaction_reference } =
      req.body;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return res.status(404).json({ error: "Order not found" });

    const method = (payment_method || order.payment_method) as PaymentMethod;
    if (!["cod", "proof_upload"].includes(String(method))) {
      return res.status(400).json({ error: "Invalid payment_method" });
    }

    if (method === "cod") {
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_method: "cod",
          payment_status: "unpaid",
          order_status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select(
          `
          *,
          order_items (
            *,
            products (title, image_url, price, created_by)
          )
        `,
        )
        .single();

      if (updateError) throw updateError;

      if (order.order_status !== "confirmed") {
        await decrementStockForOrder(orderId);
      }

      return res.json({
        order: updatedOrder,
        message: "COD selected. Order confirmed.",
      });
    }

    const file = req.file as Express.Multer.File | undefined;
    let proofUrl: string | null = payment_document_url || null;
    if (file) {
      const uploaded = await uploadBufferToCloudinary(
        file,
        `bellytalk/orders/${orderId}/payment-proof`,
      );
      proofUrl = uploaded?.secure_url || null;
    }

    if (!proofUrl) {
      return res.status(400).json({
        error:
          "payment proof is required for proof_upload (payment_document file or payment_document_url)",
      });
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_method: "proof_upload",
        payment_status: "pending_review",
        order_status: "pending",
        payment_document_url: proofUrl,
        payment_reference: transaction_reference || null,
        payment_submitted_at: new Date().toISOString(),
        payment_rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select(
        `
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `,
      )
      .single();

    if (updateError) throw updateError;

    return res.json({
      order: updatedOrder,
      message: "Payment proof submitted for review.",
    });
  } catch (err: any) {
    console.error("processPayment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const reviewOrderPayment = async (req: AuthRequest, res: Response) => {
  try {
    const reviewerId = req.user!.id;
    const { id } = req.params;
    const { status, rejection_reason } = req.body as {
      status: "approved" | "rejected";
      rejection_reason?: string;
    };

    const access = await canReviewOrderPayment(reviewerId, id);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const order = access.order;

    if (order.payment_method !== "proof_upload") {
      return res
        .status(400)
        .json({ error: "Only proof_upload orders can be reviewed" });
    }

    if (status === "approved") {
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          order_status: "confirmed",
          payment_reviewed_by: reviewerId,
          payment_reviewed_at: new Date().toISOString(),
          payment_rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          *,
          order_items (
            *,
            products (title, image_url, price, created_by)
          )
        `,
        )
        .single();

      if (updateError) throw updateError;

      if (order.order_status !== "confirmed") {
        await decrementStockForOrder(id);
      }

      return res.json({ order: updatedOrder, message: "Payment approved" });
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "rejected",
        order_status: "pending",
        payment_reviewed_by: reviewerId,
        payment_reviewed_at: new Date().toISOString(),
        payment_rejection_reason: rejection_reason || "Payment proof rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `,
      )
      .single();

    if (updateError) throw updateError;

    return res.json({ order: updatedOrder, message: "Payment rejected" });
  } catch (err: any) {
    console.error("reviewOrderPayment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const listOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    let query = supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (
            title,
            image_url,
            price,
            created_by
          )
        ),
        profiles!orders_user_id_fkey (
          full_name,
          email
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (!(profile?.role === "doctor" || profile?.role === "admin")) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.json({ orders: data });
  } catch (err: any) {
    console.error("listOrders error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (
            title,
            image_url,
            price,
            created_by
          )
        ),
        profiles!orders_user_id_fkey (
          full_name,
          email,
          phone
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    const isOwner = data.user_id === userId;
    const isDoctor = profile?.role === "doctor";
    const isAdmin = profile?.role === "admin";
    const isProductOwner = (data.order_items || []).some(
      (item: any) => item.products.created_by === userId,
    );

    if (!isOwner && !isDoctor && !isAdmin && !isProductOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({ order: data });
  } catch (err: any) {
    console.error("getOrder error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { order_status, tracking_number, notes } = req.body;

    const [{ data: profile }, { data: order }] = await Promise.all([
      supabaseAdmin.from("profiles").select("role").eq("id", userId).single(),
      supabaseAdmin
        .from("orders")
        .select(
          `
          *,
          order_items (
            *,
            products (created_by)
          )
        `,
        )
        .eq("id", id)
        .single(),
    ]);

    if (!order) return res.status(404).json({ error: "Order not found" });

    const isAdmin = profile?.role === "admin";
    const isDoctor = profile?.role === "doctor";
    const isProductOwner = (order.order_items || []).some(
      (item: any) => item.products.created_by === userId,
    );

    if (!isAdmin && !isDoctor && !isProductOwner) {
      return res.status(403).json({
        error:
          "Only product owners, doctors, or admins can update order status",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (order_status && !validStatuses.includes(order_status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const isCodFlow = order.payment_method === "cod";
    if (
      order.payment_status !== "paid" &&
      !isCodFlow &&
      order_status !== "cancelled"
    ) {
      return res.status(400).json({
        error: "Cannot update order status until payment is completed",
      });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (order_status) updateData.order_status = order_status;
    if (tracking_number !== undefined)
      updateData.tracking_number = tracking_number;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        order_items (
          *,
          products (
            title,
            image_url,
            price,
            created_by
          )
        )
      `,
      )
      .single();

    if (error) throw error;

    return res.json({
      order: data,
      message: "Order updated successfully",
    });
  } catch (err: any) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    const [{ data: profile }, { data: order }] = await Promise.all([
      supabaseAdmin.from("profiles").select("role").eq("id", userId).single(),
      supabaseAdmin
        .from("orders")
        .select(
          `
          *,
          order_items (
            *,
            products (created_by)
          )
        `,
        )
        .eq("id", id)
        .single(),
    ]);

    if (!order) return res.status(404).json({ error: "Order not found" });

    const isOwner = order.user_id === userId;
    const isAdmin = profile?.role === "admin";
    const isDoctor = profile?.role === "doctor";
    const isProductOwner = (order.order_items || []).some(
      (item: any) => item.products.created_by === userId,
    );

    if (isOwner) {
      if (!["pending", "confirmed"].includes(order.order_status)) {
        return res
          .status(400)
          .json({ error: "Cannot cancel order at this stage" });
      }
    } else if (!isAdmin && !isDoctor && !isProductOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: "cancelled",
        notes: reason ? `Cancelled: ${reason}` : order.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `,
      )
      .single();

    if (updateError) throw updateError;

    if (order.order_status === "confirmed") {
      for (const item of order.order_items || []) {
        await supabaseAdmin.rpc("increment_product_stock", {
          product_id: item.product_id,
          increment_by: item.quantity,
        });
      }
    }

    return res.json({
      order: updatedOrder,
      message: "Order cancelled successfully",
    });
  } catch (err: any) {
    console.error("cancelOrder error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ orders: data });
  } catch (err: any) {
    console.error("getMyOrders error:", err);
    return res.status(500).json({ error: err.message });
  }
};
