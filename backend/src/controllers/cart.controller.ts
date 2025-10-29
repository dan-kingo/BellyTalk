import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

/**
 * Get or create a cart for the user
 */
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // find cart
    const { data: carts, error: cartsErr } = await supabaseAdmin
      .from("carts")
      .select("*")
      .eq("user_id", userId)
      .limit(1);
    
    if (cartsErr) throw cartsErr;

    let cart = carts?.[0];
    if (!cart) {
      const { data: newCart, error: insertErr } = await supabaseAdmin
        .from("carts")
        .insert([{ user_id: userId }])
        .select()
        .single();
      if (insertErr) throw insertErr;
      cart = newCart;
    }

    // get items with proper join syntax
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("cart_items")
      .select(`
        *,
        products (
          title,
          price,
          image_url
        )
      `)
      .eq("cart_id", cart.id);

    if (itemsErr) throw itemsErr;

    res.json({ cart, items });
  } catch (err: any) {
    console.error("getCart error:", err);
    res.status(500).json({ error: err.message });
  }
};
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, quantity } = req.body;

    // ensure cart exists
    const { data: carts } = await supabaseAdmin.from("carts").select("*").eq("user_id", userId).limit(1);
    let cart = carts?.[0];
    if (!cart) {
      const { data: newCart } = await supabaseAdmin.from("carts").insert([{ user_id: userId }]).select().single();
      cart = newCart;
    }

    // check if item exists
    const { data: existing } = await supabaseAdmin
      .from("cart_items")
      .select("*")
      .eq("cart_id", cart.id)
      .eq("product_id", productId)
      .limit(1);

    if (existing && existing.length) {
      // update quantity
      const item = existing[0];
      const newQty = item.quantity + Number(quantity);
      const { data, error } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity: newQty })
        .eq("id", item.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return res.json({ item: data });
    }

    // insert new item
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .insert([{ cart_id: cart.id, product_id: productId, quantity }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err: any) {
    console.error("addToCart error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;

    // verify item belongs to user's cart
    const { data: item, error: itemErr } = await supabaseAdmin
      .from("cart_items")
      .select("cart_id")
      .eq("id", itemId)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item) return res.status(404).json({ error: "Item not found" });

    const { data: cart } = await supabaseAdmin.from("carts").select("user_id").eq("id", item.cart_id).maybeSingle();
    if (!cart || cart.user_id !== userId) return res.status(403).json({ error: "Forbidden" });

    const { error } = await supabaseAdmin.from("cart_items").delete().eq("id", itemId);
    if (error) throw error;
    res.json({ message: "Item removed" });
  } catch (err: any) {
    console.error("removeFromCart error:", err);
    res.status(500).json({ error: err.message });
  }
};
