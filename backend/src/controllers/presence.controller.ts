import { Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export const updateMyPresence = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status } = req.body;
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("user_presence")
      .upsert(
        {
          user_id: userId,
          status,
          last_seen: now,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (error) throw error;
    return res.json({ presence: data });
  } catch (err: any) {
    console.error("updateMyPresence error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to update presence" });
  }
};

export const listDoctorsPresence = async (req: AuthRequest, res: Response) => {
  try {
    const idsParam = typeof req.query.ids === "string" ? req.query.ids : "";
    const requestedIds = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    let doctorIds = Array.from(new Set(requestedIds));

    if (!doctorIds.length) {
      const { data: doctorProfiles, error: doctorProfilesError } =
        await supabaseAdmin
          .from("doctor_profiles")
          .select("user_id")
          .eq("verification_status", "approved")
          .limit(200);
      if (doctorProfilesError) throw doctorProfilesError;
      doctorIds = (doctorProfiles || []).map((d) => d.user_id);
    }

    if (!doctorIds.length) {
      return res.json({ doctors: [] });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", doctorIds);
    if (profilesError) throw profilesError;

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const { data: presenceRows, error: presenceError } = await supabaseAdmin
      .from("user_presence")
      .select("user_id, status, last_seen, updated_at")
      .in("user_id", doctorIds);
    if (presenceError) throw presenceError;

    const presenceMap = new Map(
      (presenceRows || []).map((p) => [p.user_id, p]),
    );
    const result = doctorIds.map((id) => {
      const doctor = profileMap.get(id);
      const p = presenceMap.get(id);
      return {
        id,
        full_name: doctor?.full_name || null,
        status: p?.status || "offline",
        last_seen: p?.last_seen || null,
        updated_at: p?.updated_at || null,
      };
    });

    return res.json({ doctors: result });
  } catch (err: any) {
    console.error("listDoctorsPresence error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to list doctor presence" });
  }
};
