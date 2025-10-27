import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase";
import { sendMail } from "../services/email.service.js";
import { uploadFile } from "./upload.controller.js"; // 👈 reusing your own service

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

    // Handle avatar file (if provided)
    if ((req as any).file) {
      // use your existing uploadFile util
      const fileReq = Object.assign({}, req, { body: { folder: `bellytalk/avatars/${userId}` } });
      const uploadRes = await new Promise<any>((resolve) => {
        (uploadFile as any)(fileReq, {
          status: () => ({ json: (data: any) => resolve(data) })
        } as any);
      });

      if (uploadRes?.result?.secure_url) payload.avatar_url = uploadRes.result.secure_url;
    }

    if (Object.keys(payload).length === 0) return res.status(400).json({ error: "No updatable fields provided" });

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select()
      .maybeSingle();

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
    const { role } = req.body;
    if (!role || !["doctor", "counselor"].includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const uploadedDocs: string[] = [];

    // Handle file uploads (if present)
    if ((req as any).files && Array.isArray((req as any).files)) {
      for (const file of (req as any).files) {
        const mockReq = {
          ...req,
          file,
          body: { folder: `bellytalk/role-requests/${userId}` }
        };
        const uploadRes = await new Promise<any>((resolve) => {
          (uploadFile as any)(mockReq, {
            status: () => ({ json: (data: any) => resolve(data) })
          } as any);
        });

        if (uploadRes?.result?.secure_url) uploadedDocs.push(uploadRes.result.secure_url);
      }
    }

    const extraUpdate = { requested_role: role, documents: uploadedDocs };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ extra: extraUpdate, role_status: "pending" })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    // Notify admins
    const { data: admins } = await supabaseAdmin.from("profiles").select("email").eq("role", "admin");
    if (admins?.length) {
      const emails = admins.map((a: any) => a.email).filter(Boolean);
      const html = `
        <p>User <strong>${data.full_name}</strong> (${data.email}) requested <strong>${role}</strong> access.</p>
        <p>Documents:</p>
        <ul>${uploadedDocs.map((u) => `<li><a href="${u}" target="_blank">${u}</a></li>`).join("")}</ul>
      `;
      for (const to of emails) await sendMail(to, "BellyTalk Role Request", html);
    }

    res.status(200).json({ message: "Role request submitted", documents: uploadedDocs, profile: data });
  } catch (err) {
    console.error("requestRoleUpgrade error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
