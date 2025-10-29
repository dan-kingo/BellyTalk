import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { sendMail } from "../services/email.service.js";

/**
 * POST /api/hms/webhook
 * Called by 100ms when session starts, ends, or recording is ready.
 */
export const handleHMSWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body?.event;
    const data = req.body?.data;
    console.log("🎧 HMS webhook:", event);

    if (!event || !data) return res.status(400).json({ error: "Invalid webhook payload" });

    // Match our local session
    const roomId = data.room_id || data.room;
    if (!roomId) return res.status(400).json({ error: "No room_id in webhook" });

    const { data: session } = await supabaseAdmin
      .from("audio_sessions")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle();
    if (!session) return res.status(404).json({ error: "Session not found for room" });

    // Build update object
    const updates: any = { last_event: event, updated_at: new Date().toISOString() };

    if (event === "session.started") {
      updates.status = "active";
      updates.started_at = new Date().toISOString();
    }

    if (event === "session.ended") {
      updates.status = "ended";
      updates.ended_at = new Date().toISOString();
    }

    if (event === "recording.ready") {
      updates.recording_url = data?.recording_url || data?.url;
      updates.recording_duration = data?.duration || null;
    }

    const { data: updated, error } = await supabaseAdmin
      .from("audio_sessions")
      .update(updates)
      .eq("id", session.id)
      .select()
      .maybeSingle();
    if (error) throw error;

    // When recording is ready, email both participants
    if (event === "recording.ready" && updated?.recording_url) {
      try {
        const { data: users } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", [session.initiator_id, session.receiver_id]);

        const emails = users?.map(u => u.email).filter(Boolean) || [];
        const subject = "🎧 BellyTalk Session Recording Ready";
        const html = `
          <p>Your audio session has ended and the recording is now available.</p>
          <p><a href="${updated.recording_url}">${updated.recording_url}</a></p>
          <p>Duration: ${updated.recording_duration || "Unknown"} seconds</p>
        `;

        for (const to of emails) await sendMail(to, subject, html);
      } catch (mailErr) {
        console.warn("Failed to send recording email:", mailErr);
      }
    }

    if (event === "video.recording.ready") {
  const roomId = data?.room_id;
  if (roomId) {
    const { data: session } = await supabaseAdmin
      .from("video_sessions")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle();
    if (session) {
      const updates = {
        recording_url: data?.recording_url || data?.url,
        recording_duration: data?.duration,
        ended_at: new Date().toISOString(),
        status: "ended",
      };
      await supabaseAdmin.from("video_sessions").update(updates).eq("id", session.id);

      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", [session.initiator_id, session.receiver_id]);

      const emails = users?.map(u => u.email).filter(Boolean);
      const html = `
        <p>Your video session recording is ready:</p>
        <a href="${updates.recording_url}">${updates.recording_url}</a>
        <p>Duration: ${updates.recording_duration || "Unknown"} seconds</p>
      `;
      for (const to of emails || []) await sendMail(to, "📹 Video Recording Ready — BellyTalk", html);
    }
  }
}

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("HMS webhook error:", err);
    res.status(500).json({ error: err.message });
  }
};
