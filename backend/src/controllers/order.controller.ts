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

    // Validate shipping address
    if (!shipping_address || !shipping_address.address || !shipping_address.city || !shipping_address.country) {
      return res.status(400).json({ error: "Complete shipping address is required" });
    }

    const { data: cart } = await supabaseAdmin.from("carts").select("*").eq("user_id", userId).maybeSingle();
    if (!cart) return res.status(400).json({ error: "No cart found" });

    const { data: items } = await supabaseAdmin
      .from("cart_items")
      .select(`
        product_id,
        quantity,
        products!inner(title, price, stock, created_by)
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
          product_title: i.products?.title,
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
      return { 
        product_id: it.product_id, 
        quantity: qty, 
        unit_price: price,
      };
    });

    // Create order with new status fields
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([{
        user_id: userId,
        total_price: total,
        payment_status: 'pending', // Start with pending payment
        order_status: 'pending',   // Order is pending until payment
        shipping_address: shipping_address,
        notes: notes || null
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
          products (title, image_url, price, created_by)
        )
      `)
      .eq("id", order.id)
      .single();

    res.status(201).json({ 
      order: completeOrder,
      message: "Order created successfully. Please proceed with payment."
    });
  } catch (err: any) {
    console.error("createOrder error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Mock payment processing
 */
export const processPayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.params;
    const { paymentMethod } = req.body; // Simulating payment method

    // Verify order exists and belongs to user
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: "Order is already paid" });
    }

    if (order.payment_status === 'failed') {
      return res.status(400).json({ error: "Order payment failed. Please try again." });
    }

    // Mock payment processing - 80% success rate
    const isPaymentSuccessful = Math.random() > 0.2;

    let paymentStatus: 'paid' | 'failed' = 'failed';
    let orderStatus: 'pending' | 'confirmed' = 'pending';

    if (isPaymentSuccessful) {
      paymentStatus = 'paid';
      orderStatus = 'confirmed'; // Move to confirmed when payment is successful
      
      // Update product stock
      const { data: orderItems } = await supabaseAdmin
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (orderItems) {
        for (const item of orderItems) {
          await supabaseAdmin.rpc('decrement_product_stock', {
            product_id: item.product_id,
            decrement_by: item.quantity
          });
        }
      }
    }

    // Update order with payment result
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: paymentStatus,
        order_status: orderStatus,
        payment_intent_id: `mock_pi_${Date.now()}`, // Mock payment intent ID
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select(`
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: isPaymentSuccessful,
      order: updatedOrder,
      message: isPaymentSuccessful 
        ? "Payment successful! Your order has been confirmed." 
        : "Payment failed. Please try again."
    });
  } catch (err: any) {
    console.error("processPayment error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * List orders with proper permissions
 */
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
            price,
            created_by
          )
        ),
        profiles!orders_user_id_fkey (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    // If user is not doctor/admin, only show their own orders
    if (!(profile?.role === 'doctor' || profile?.role === 'admin')) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ orders: data });
  } catch (err: any) {
    console.error("listOrders error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get specific order
 */
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
            price,
            created_by
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
    
    // For product owners, check if they own any product in this order
    const isProductOwner = data.order_items?.some((item: any) => 
      item.products.created_by === userId
    );

    if (!isOwner && !isDoctor && !isAdmin && !isProductOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ order: data });
  } catch (err: any) {
    console.error("getOrder error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update order status (for product owners/admins/doctors)
 */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { order_status, tracking_number, notes } = req.body;

    // Get user profile and order details
    const [{ data: profile }, { data: order }] = await Promise.all([
      supabaseAdmin.from("profiles").select("role").eq("id", userId).single(),
      supabaseAdmin.from("orders").select(`
        *,
        order_items (
          *,
          products (created_by)
        )
      `).eq("id", id).single()
    ]);

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Check permissions
    const isAdmin = profile?.role === 'admin';
    const isDoctor = profile?.role === 'doctor';
    const isProductOwner = order.order_items?.some((item: any) => 
      item.products.created_by === userId
    );

    if (!isAdmin && !isDoctor && !isProductOwner) {
      return res.status(403).json({ error: "Only product owners, doctors, or admins can update order status" });
    }

    // Validate order status transition
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (order_status && !validStatuses.includes(order_status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    // Check if order is paid before allowing status updates (except cancellation)
    if (order.payment_status !== 'paid' && order_status !== 'cancelled') {
      return res.status(400).json({ error: "Cannot update order status until payment is completed" });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (order_status) updateData.order_status = order_status;
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
            price,
            created_by
          )
        )
      `)
      .single();

    if (error) throw error;

    res.json({ 
      order: data, 
      message: "Order updated successfully" 
    });
  } catch (err: any) {
    console.error("updateOrderStatus error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Cancel order (user can cancel if pending, product owners/admins can cancel anytime)
 */
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    const [{ data: profile }, { data: order }] = await Promise.all([
      supabaseAdmin.from("profiles").select("role").eq("id", userId).single(),
      supabaseAdmin.from("orders").select(`
        *,
        order_items (
          *,
          products (created_by)
        )
      `).eq("id", id).single()
    ]);

    if (!order) return res.status(404).json({ error: "Order not found" });

    const isOwner = order.user_id === userId;
    const isAdmin = profile?.role === 'admin';
    const isDoctor = profile?.role === 'doctor';
    const isProductOwner = order.order_items?.some((item: any) => 
      item.products.created_by === userId
    );

    // Check permissions and conditions
    if (isOwner) {
      // User can only cancel if order is pending or confirmed
      if (!['pending', 'confirmed'].includes(order.order_status)) {
        return res.status(400).json({ error: "Cannot cancel order at this stage" });
      }
    } else if (!isAdmin && !isDoctor && !isProductOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : order.notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select(`
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `)
      .single();

    if (updateError) throw updateError;

    // Restore product stock if order was confirmed
    if (order.order_status === 'confirmed') {
      const orderItems = order.order_items || [];
      for (const item of orderItems) {
        await supabaseAdmin.rpc('increment_product_stock', {
          product_id: item.product_id,
          increment_by: item.quantity
        });
      }
    }

    res.json({ 
      order: updatedOrder, 
      message: "Order cancelled successfully" 
    });
  } catch (err: any) {
    console.error("cancelOrder error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (title, image_url, price, created_by)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ orders: data });
  } catch (err: any) {
    console.error("getMyOrders error:", err);
    res.status(500).json({ error: err.message });
  }
}