import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

const parsePagination = (query: Request["query"]) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, from, to };
};

export const listDoctorProfiles = async (req: Request, res: Response) => {
  try {
    const { verification_status, specialty } = req.query;
    const { page, from, to } = parsePagination(req.query);

    let q = supabaseAdmin
      .from("doctor_profiles")
      .select("*", { count: "exact" })
      .range(from, to)
      .order("updated_at", { ascending: false });

    if (verification_status) {
      q = q.eq("verification_status", String(verification_status));
    } else {
      q = q.eq("verification_status", "approved");
    }

    if (specialty) {
      q = q.contains("specialties", [String(specialty)]);
    }

    const { data, error, count } = await q;
    if (error) throw error;

    return res.json({ doctors: data || [], page, total: count || 0 });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list doctor profiles" });
  }
};

export const getDoctorProfile = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("doctor_profiles")
      .select("*")
      .eq("user_id", doctorId)
      .maybeSingle();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ error: "Doctor profile not found" });

    return res.json({ doctor: data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch doctor profile" });
  }
};

export const getMyDoctorProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from("doctor_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Doctor profile not found" });
    }

    return res.json({ doctor: data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch doctor profile" });
  }
};

export const upsertMyDoctorProfile = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from("profiles")
      .select("role_status, extra")
      .eq("id", userId)
      .maybeSingle();

    if (profileFetchError) throw profileFetchError;

    const shouldResetToPending = profile?.role_status !== "approved";
    const nextProfileExtra = {
      ...(profile?.extra || {}),
      requested_role: "doctor",
      rejection_reason: null,
    };

    if (shouldResetToPending) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ role_status: "pending", extra: nextProfileExtra })
        .eq("id", userId);

      if (profileUpdateError) throw profileUpdateError;
    }

    const payload = {
      ...req.body,
      user_id: userId,
      verification_status: shouldResetToPending ? "pending" : "approved",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("doctor_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ doctor: data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to save doctor profile" });
  }
};
