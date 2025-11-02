import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { sendMail } from "../services/email.service.js";


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
 * approveProvider
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

    // send email to user
    try {
      const html = `<p>Your request to become <strong>${updatedRole}</strong> has been approved. You can now access provider features.</p>`;
      await sendMail(existing.email, "Provider request approved — BellyTalk", html);
    } catch (mailErr) {
      console.warn("Failed to send approval email", mailErr);
    }

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("approveProvider error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * rejectProvider
 */
export const rejectProvider = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    const { reason } = req.body;

    const { data: existing, error: getErr } = await supabaseAdmin.from("profiles").select("*").eq("id", targetId).maybeSingle();
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!existing) return res.status(404).json({ error: "Provider not found" });

    const extra = { ...(existing.extra || {}), rejection_reason: reason || null };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role_status: "rejected", extra })
      .eq("id", targetId)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    try {
      const html = `<p>Your provider request was rejected.</p><p>Reason: ${reason || "Not specified"}</p>`;
      await sendMail(existing.email, "Provider request rejected — BellyTalk", html);
    } catch (mailErr) {
      console.warn("Failed to send rejection email", mailErr);
    }

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error("rejectProvider error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


/**
 * GET /api/admin/providers/pending
 * Lists all users who requested role upgrade
 */
export const listRoleRequests = async (_req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role_status, extra, created_at, updated_at")
      .eq("role_status", "pending");

    if (error) {
       res.status(500).json({ error: error.message });
       return;
      }

    // Extract docs from `extra`
    const requests = (data || []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      requested_role: u.extra?.requested_role || "unknown",
      documents: u.extra?.documents || [],
      submitted_at: u.updated_at,
    }));

    res.json({ count: requests.length, requests });
  } catch (err) {
    console.error("listRoleRequests error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * POST /api/admin/providers/:id/approve
 * Approves a provider role upgrade and notifies user
 */
export const approveRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Retrieve user's current profile to know requested role
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, extra")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !profile)
      return res.status(404).json({ error: "User not found or invalid ID" });

    const newRole = profile.extra?.requested_role || "doctor";

    // Update role and status
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole, role_status: "approved" })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    // Notify user
    const html = `
      <p>Dear ${data.full_name || "user"},</p>
      <p>Your request to become a <strong>${newRole}</strong> has been <strong>approved</strong>.</p>
      <p>You can now log in to your account and start offering services.</p>
      <br/>
      <p>— BellyTalk Admin Team</p>
    `;
    await sendMail(profile.email, "🎉 Role Approved — BellyTalk", html);

    res.status(200).json({ message: "Role approved successfully", profile: data });
  } catch (err) {
    console.error("approveRole error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * POST /api/admin/providers/:id/reject
 * Rejects a provider role upgrade and notifies user
 */
export const rejectRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Retrieve profile for email
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, extra")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !profile)
      return res.status(404).json({ error: "User not found or invalid ID" });

    const requestedRole = profile.extra?.requested_role || "doctor";

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role_status: "rejected" })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    // Email user
    const html = `
      <p>Dear ${profile.full_name || "user"},</p>
      <p>We regret to inform you that your request to become a <strong>${requestedRole}</strong> has been <strong>rejected</strong>.</p>
      <p>Reason: ${reason || "Not specified"}</p>
      <br/>
      <p>— BellyTalk Admin Team</p>
    `;
    await sendMail(profile.email, "❌ Role Rejected — BellyTalk", html);

    res.status(200).json({ message: "Role rejected successfully", profile: data });
  } catch (err) {
    console.error("rejectRole error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
