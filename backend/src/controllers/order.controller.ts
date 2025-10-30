import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { Request, Response } from "express";

/**
 * Create an order from user's cart
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { shipping_address, notes } = req.body;

    const { data: cart } = await supabaseAdmin.from("carts").select("*").eq("user_id", userId).maybeSingle();
    if (!cart) return res.status(400).json({ error: "No cart found" });

    const { data: items } = await supabaseAdmin
      .from("cart_items")
      .select(`
        product_id,
        quantity,
        products!inner(title, price, stock)
      `)
      .eq("cart_id", cart.id);

    if (!items || items.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // Check stock availability
    const insufficient = items.filter((i: any) => {
      const product = i.products;
      return product && product.stock < i.quantity;
    });
    if (insufficient.length) {
      return res.status(400).json({
        error: "Insufficient stock",
        items: insufficient.map((i: any) => ({
          product_id: i.product_id,
          available: i.products?.stock || 0,
          requested: i.quantity
        }))
      });
    }

    // Calculate total and prepare items
    let total = 0;
    const orderItems = items.map((it: any) => {
      const price = Number(it.products.price);
      const qty = Number(it.quantity);
      total += price * qty;
      return { product_id: it.product_id, quantity: qty, unit_price: price };
    });

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([{
        user_id: userId,
        total_price: total,
        status: 'pending',
        payment_status: 'pending',
        shipping_address,
        notes
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsWithOrderId);

    if (itemsError) throw itemsError;

    // Clear cart
    await supabaseAdmin.from("cart_items").delete().eq("cart_id", cart.id);

    // Fetch complete order
    const { data: completeOrder } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (title, image_url, price)
        )
      `)
      .eq("id", order.id)
      .single();

    res.status(201).json({ order: completeOrder });
  } catch (err: any) {
    console.error("createOrder error:", err);
    res.status(500).json({ error: err.message });
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
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            image_url,
            price
          )
        ),
        profiles!orders_user_id_fkey (
          full_name,
          email
        )
      `);

    // If user is doctor or admin, show all orders; otherwise only their own
    if (profile?.role === 'doctor' || profile?.role === 'admin') {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.eq("user_id", userId).order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ orders: data });
  } catch (err: any) {
    console.error("listOrders error:", err);
    res.status(500).json({ error: err.message });
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
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            image_url,
            price
          )
        ),
        profiles!orders_user_id_fkey (
          full_name,
          email,
          phone
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    // Check permissions
    const isOwner = data.user_id === userId;
    const isDoctor = profile?.role === 'doctor';
    const isAdmin = profile?.role === 'admin';

    if (!isOwner && !isDoctor && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ order: data });
  } catch (err: any) {
    console.error("getOrder error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, tracking_number, notes } = req.body;

    // Check if user is doctor or admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role !== 'doctor' && profile?.role !== 'admin') {
      return res.status(403).json({ error: "Only doctors and admins can update order status" });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            image_url,
            price
          )
        )
      `)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    res.json({ order: data, message: "Order updated successfully" });
  } catch (err: any) {
    console.error("updateOrderStatus error:", err);
    res.status(500).json({ error: err.message });
  }
};
