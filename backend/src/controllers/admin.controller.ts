import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { sendMail } from "../services/email.service.js";

const hasDoctorDetails = (doctor: any) => {
  const hasHeadline = Boolean(
    doctor?.headline && String(doctor.headline).trim(),
  );
  const hasBio = Boolean(doctor?.bio && String(doctor.bio).trim());
  const hasSpecialties =
    Array.isArray(doctor?.specialties) && doctor.specialties.length > 0;
  return hasHeadline || hasBio || hasSpecialties;
};

const ensureDoctorDetailsBeforeApproval = async (userId: string) => {
  const { data: doctorProfile, error } = await supabaseAdmin
    .from("doctor_profiles")
    .select("user_id, headline, bio, specialties")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!doctorProfile) {
    return {
      ok: false,
      status: 400,
      error: "Doctor details are required before approval",
    };
  }

  if (!hasDoctorDetails(doctorProfile)) {
    return {
      ok: false,
      status: 400,
      error:
        "Doctor details are incomplete. Add headline/bio/specialty before approval",
    };
  }

  return { ok: true };
};

const syncDoctorVerificationStatus = async (
  userId: string,
  verificationStatus: "pending" | "approved" | "rejected",
) => {
  const { error } = await supabaseAdmin.from("doctor_profiles").upsert(
    {
      user_id: userId,
      verification_status: verificationStatus,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
};

/**
 * list pending providers
 * GET /api/admin/providers?status=pending
 */
export const listProviders = async (req: AuthRequest, res: Response) => {
  try {
    const { status = "pending" } = req.query;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role_status", status as string);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ providers: data });
  } catch (err) {
    console.error("listProviders error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const approveRoleRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, extra")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr || !profile) {
      return res.status(404).json({ error: "User not found or invalid ID" });
    }

    const targetRole =
      profile.extra?.requested_role || profile.role || "doctor";
    if (targetRole === "doctor") {
      const detailsCheck = await ensureDoctorDetailsBeforeApproval(id);
      if (!detailsCheck.ok) {
        return res
          .status(detailsCheck.status || 400)
          .json({ error: detailsCheck.error });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role: targetRole, role_status: "approved" })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    if (targetRole === "doctor") {
      await syncDoctorVerificationStatus(id, "approved");
    }

    try {
      const html = `<p>Dear ${data?.full_name || "user"},</p><p>Your request to become a <strong>${targetRole}</strong> has been <strong>approved</strong>.</p><p>You can now log in to your account and start offering services.</p><br/><p>- BellyTalk Admin Team</p>`;
      await sendMail(profile.email, "Role Approved - BellyTalk", html);
    } catch (mailErr) {
      console.warn("Failed to send role approval email", mailErr);
    }

    return res.status(200).json({
      message: "Role approved successfully",
      profile: data,
    });
  } catch (err) {
    console.error("approveRoleRequest error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const rejectRoleRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, extra")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr || !profile) {
      return res.status(404).json({ error: "User not found or invalid ID" });
    }

    const requestedRole =
      profile.extra?.requested_role || profile.role || "doctor";
    const extra = {
      ...(profile.extra || {}),
      rejection_reason: reason || null,
    };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role_status: "rejected", extra })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    if (requestedRole === "doctor") {
      await syncDoctorVerificationStatus(id, "rejected");
    }

    try {
      const html = `<p>Dear ${profile.full_name || "user"},</p><p>We regret to inform you that your request to become a <strong>${requestedRole}</strong> has been <strong>rejected</strong>.</p><p>Reason: ${reason || "Not specified"}</p><br/><p>- BellyTalk Admin Team</p>`;
      await sendMail(profile.email, "Role Rejected - BellyTalk", html);
    } catch (mailErr) {
      console.warn("Failed to send role rejection email", mailErr);
    }

    return res.status(200).json({
      message: "Role rejected successfully",
      profile: data,
    });
  } catch (err) {
    console.error("rejectRoleRequest error:", err);
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
      .select(
        "id, full_name, email, role_status, extra, created_at, updated_at",
      )
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

export const approveRole = approveRoleRequest;
export const rejectRole = rejectRoleRequest;

// Legacy aliases kept for backward-compatible /providers/:id/* routes.
export const approveProvider = approveRoleRequest;
export const rejectProvider = rejectRoleRequest;
