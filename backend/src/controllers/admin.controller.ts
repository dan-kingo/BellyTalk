import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase";

/**
 * list pending providers
 * GET /api/admin/providers?status=pending
 */
export const listProviders = async (req: AuthRequest, res: Response) => {
  try {
    const { status = "pending" } = req.query;

    const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("role_status", status as string);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ providers: data });
  } catch (err) {
    console.error("listProviders error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * approve provider
 * POST /api/admin/providers/:id/approve
 */
export const approveProvider = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    const { data: existing, error: getErr } = await supabaseAdmin.from("profiles").select("*").eq("id", targetId).maybeSingle();
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!existing) return res.status(404).json({ error: "Provider not found" });

    const updatedRole = existing.extra?.requested_role || existing.role;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role: updatedRole, role_status: "approved" })
      .eq("id", targetId)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    // Optionally send email to user

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("approveProvider error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * reject provider
 * POST /api/admin/providers/:id/reject
 * Body: { reason }
 */
export const rejectProvider = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    const { reason } = req.body;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role_status: "rejected", extra: { ...req.body.extra, rejection_reason: reason } })
      .eq("id", targetId)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    // Optionally email user with reason

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("rejectProvider error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
