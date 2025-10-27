import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { sendMail } from "../services/email.service.js";

export const simulatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId, simulate } = req.body; // simulate = 'success'|'fail'

    const { data: order, error: orderErr } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.user_id !== userId) return res.status(403).json({ error: "Forbidden" });

    const amount = Number(order.total_price);
    const gatewayRef = `MOCK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const paymentStatus = simulate === "success" ? "success" : "failed";
    const orderStatus = simulate === "success" ? "paid" : "failed";

    // create payment record
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert([{ order_id: orderId, user_id: userId, amount, method: "mock", status: paymentStatus, gateway_reference: gatewayRef }])
      .select()
      .single();
    if (payErr) throw payErr;

    // update order
    const { data: updatedOrder, error: updErr } = await supabaseAdmin
      .from("orders")
      .update({ status: orderStatus, payment_reference: gatewayRef, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .maybeSingle();
    if (updErr) throw updErr;

    // send email receipt on success
    if (paymentStatus === "success") {
      try {
        const html = `<p>Your payment for order <strong>${orderId}</strong> was successful.</p><p>Amount: ${amount}</p><p>Reference: ${gatewayRef}</p>`;
        await sendMail(req.user!.email!, "Payment successful — BellyTalk", html);
      } catch (mailErr) {
        console.warn("Failed to send payment email", mailErr);
      }
    }

    res.json({ payment, order: updatedOrder });
  } catch (err: any) {
    console.error("simulatePayment error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Simulate a payment webhook callback
 * Body: { orderId: string, status: 'success' | 'failed' }
 */
export const mockPaymentWebhook = async (req: Request, res: Response) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) return res.status(400).json({ error: "Missing parameters" });

    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return res.status(404).json({ error: "Order not found" });

    const gatewayRef = `WH-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const payStatus = status === "success" ? "success" : "failed";

    // Record payment
    await supabaseAdmin
      .from("payments")
      .insert([{ order_id: orderId, user_id: order.user_id, amount: order.total_price, method: "mock", status: payStatus, gateway_reference: gatewayRef, webhook_processed: true }]);

    // Update order
    await supabaseAdmin
      .from("orders")
      .update({ status: payStatus === "success" ? "paid" : "failed", payment_reference: gatewayRef })
      .eq("id", orderId);

    res.json({ message: "Webhook processed", order_id: orderId, status: payStatus });
  } catch (err: any) {
    console.error("mockPaymentWebhook error:", err);
    res.status(500).json({ error: err.message });
  }
};
