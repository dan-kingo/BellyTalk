import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase";

/**
 * GET /api/profile/me
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Profile not found" });

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * PUT /api/profile/me
 * allowed updates: full_name, phone, language, avatar_url, bio, location, extra (careful)
 */
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const allowed = ["full_name", "phone", "language", "avatar_url", "bio", "location", "extra"];
    const payload: Record<string, any> = {};
    for (const key of allowed) {
      if (key in req.body) payload[key] = req.body[key];
    }

    if (Object.keys(payload).length === 0) return res.status(400).json({ error: "No updatable fields provided" });

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin.from("profiles").update(payload).eq("id", userId).select().maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("updateMe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * POST /api/profile/request-role-upgrade
 * Body: { role: 'doctor'|'counselor', documents: [{url, type}] }
 */
export const requestRoleUpgrade = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { role, documents } = req.body;
    if (!role || !["doctor", "counselor"].includes(role)) return res.status(400).json({ error: "Invalid role" });

    // Save requested role in extra and set role_status to 'pending'
    const extraUpdate = { requested_role: role, documents: documents || [] };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ extra: extraUpdate, role_status: "pending" })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    // Optionally notify admins via email/webhook here

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("requestRoleUpgrade error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
