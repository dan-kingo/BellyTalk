import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { Request, Response } from "express";

/**
 * Create an order from user's cart
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: cart } = await supabaseAdmin.from("carts").select("*").eq("user_id", userId).maybeSingle();
    if (!cart) return res.status(400).json({ error: "No cart found" });

    const { data: items } = await supabaseAdmin
      .from("cart_items")
      .select("product_id, quantity, products!inner(title, price, stock)")
      .eq("cart_id", cart.id);

    if (!items || items.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // Check stock availability - FIXED ACCESS
    const insufficient = items.filter((i: any) => i.products.stock < i.quantity);
    if (insufficient.length) {
      return res.status(400).json({
        error: "Insufficient stock",
        items: insufficient.map((i) => ({ 
          product_id: i.product_id, 
          available: i.products[0].stock, 
          requested: i.quantity 
        }))
      });
    }

    // Calculate total and prepare items - FIXED ACCESS
    let total = 0;
    const orderItems = items.map((it: any) => {
      const price = Number(it.products.price);
      const qty = Number(it.quantity);
      total += price * qty;
      return { product_id: it.product_id, quantity: qty, unit_price: price };
    });

    // Rest of your code remains the same...
    let order;
    
    // Use a transaction for data consistency
    const { data, error } = await supabaseAdmin.rpc('create_order_transaction', {
      p_user_id: userId,
      p_total: total,
      p_order_items: orderItems
    });
    
    if (error) throw error;
    order = data;

    res.status(201).json({ order });
  } catch (err: any) {
    console.error("createOrder error:", err);
    res.status(500).json({ error: err.message });
  }
};
export const listOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin.from("orders").select("*, order_items(*)").eq("user_id", userId).order("created_at", { ascending: false });
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
    const { data, error } = await supabaseAdmin.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });
    if (data.user_id !== userId) return res.status(403).json({ error: "Forbidden" });
    res.json({ order: data });
  } catch (err: any) {
    console.error("getOrder error:", err);
    res.status(500).json({ error: err.message });
  }
};
