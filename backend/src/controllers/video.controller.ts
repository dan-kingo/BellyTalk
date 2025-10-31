import dotenv from "dotenv";

import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { hmsService } from "../services/hms.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { sendMail } from "../services/email.service.js";
dotenv.config();

export const createVideoSession = async (req: AuthRequest, res: Response) => {
  try {
    const initiatorId = req.user!.id;
    const { receiver_id, region } = req.body;
    if (!receiver_id) return res.status(400).json({ error: "receiver_id required" });

    let room;
    try {
      room = await hmsService.createRoom({
        name: `video-${initiatorId}-${receiver_id}-${Date.now()}`,
        description: "BellyTalk video consultation",
        template_id: process.env.HMS_VIDEO_TEMPLATE_ID!,
      });
   } catch (hmsError: any) {
  console.error("Full HMS createRoom error:", {
    message: hmsError.message,
    status: hmsError.response?.status,
    data: hmsError.response?.data,
    headers: hmsError.response?.headers,
  });
  return res.status(500).json({
    error: "Failed to create video room. Please check HMS configuration.",
    details: hmsError.response?.data || hmsError.message // This will now capture more info
  });
}

    const roomId = room?.id || room?.data?.id;
    if (!roomId) {
      console.error("No room ID returned from HMS. Response:", room);
      return res.status(500).json({ error: "Failed to create room: No room ID returned" });
    }

    const { data, error } = await supabaseAdmin
      .from("video_sessions")
      .insert([
        {
          initiator_id: initiatorId,
          receiver_id,
          room_id: roomId,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ session: data });
  } catch (err: any) {
    console.error("createVideoSession error:", err?.response?.data || err);
    res.status(500).json({ error: err.message || "Failed to create video session" });
  }
};

export const getVideoToken = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user!.id;
    const { session_id, room_id, role = "guest", user_name } = req.body;
    let roomId = room_id;

    if (session_id && !roomId) {
      const { data: s } = await supabaseAdmin
        .from("video_sessions")
        .select("room_id")
        .eq("id", session_id)
        .maybeSingle();
      if (!s) return res.status(404).json({ error: "Session not found" });
      roomId = s.room_id;
    }

    if (!roomId) return res.status(400).json({ error: "room_id or session_id required" });

    const token = hmsService.generateAuthToken({ room_id: roomId, user_id, role, user_name });

    if (session_id) {
      await supabaseAdmin
        .from("video_sessions")
        .update({
          token,
          status: "active",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id);
    }

    res.json({ token, room_id: roomId });
  } catch (err: any) {
    console.error("getVideoToken error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const endVideoSession = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.params;
    const { summary } = req.body;

    const { data: session } = await supabaseAdmin
      .from("video_sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();
    if (!session) return res.status(404).json({ error: "Session not found" });

    const updates: any = {
      status: "ended",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(summary && { summary }),
    };

    const { data, error } = await supabaseAdmin
      .from("video_sessions")
      .update(updates)
      .eq("id", session_id)
      .select()
      .maybeSingle();
    if (error) throw error;

    // Notify participants
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .in("id", [session.initiator_id, session.receiver_id]);

    const subject = "📹 BellyTalk Video Session Ended";
    const html = `<p>Your session has ended.</p><p>Summary: ${summary || "N/A"}</p>`;
    for (const u of users || []) await sendMail(u.email, subject, html);

    res.json({ session: data });
  } catch (err: any) {
    console.error("endVideoSession error:", err);
    res.status(500).json({ error: err.message });
  }
};
