import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase";
import { sendMail } from "../services/email.service.js";

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
 * requestRoleUpgrade - updated to notify admins
 */
export const requestRoleUpgrade = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { role, documents } = req.body;
    if (!role || !["doctor", "counselor"].includes(role)) return res.status(400).json({ error: "Invalid role" });

    const extraUpdate = { requested_role: role, documents: documents || [] };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ extra: extraUpdate, role_status: "pending" })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    // Find admin emails
    const { data: admins, error: adminErr } = await supabaseAdmin.from("profiles").select("email").eq("role", "admin");
    if (!adminErr && Array.isArray(admins) && admins.length) {
      const emails = admins.map((a: any) => a.email).filter(Boolean);
      const html = `
        <p>A user (${data.email}) requested to become <strong>${role}</strong>.</p>
        <p>Open the admin panel to review documents and approve or reject.</p>
      `;
      // send to each admin (could be batched)
      for (const to of emails) {
        try {
          await sendMail(to, "Provider Role Request — BellyTalk", html);
        } catch (mailErr) {
          console.warn("Failed to notify admin", to, mailErr);
        }
      }
    }

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("requestRoleUpgrade error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
