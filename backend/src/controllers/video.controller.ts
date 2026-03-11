import dotenv from "dotenv";

import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { hmsService } from "../services/hms.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { sendMail } from "../services/email.service.js";
import { checkDirectInteractionAccess } from "../services/booking-access.service.js";
dotenv.config();

export const createVideoSession = async (req: AuthRequest, res: Response) => {
  try {
    const initiatorId = req.user!.id;
    const { receiver_id, booking_id } = req.body;
    if (!receiver_id)
      return res.status(400).json({ error: "receiver_id required" });

    const access = await checkDirectInteractionAccess({
      actorId: initiatorId,
      peerId: receiver_id,
      channel: "video",
      bookingId: booking_id,
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    let room;
    try {
      room = await hmsService.createRoom({
        name: `video-${initiatorId}-${receiver_id}-${Date.now()}`,
        description: "BellyTalk video consultation",
        template_id: process.env.HMS_VIDEO_TEMPLATE_ID,
      });
      console.log("Video room created:", room);
    } catch (hmsError: any) {
      console.error("Full HMS createRoom error:", {
        message: hmsError.message,
        status: hmsError.response?.status,
        data: hmsError.response?.data,
        headers: hmsError.response?.headers,
      });
      return res.status(500).json({
        error:
          hmsError.message ||
          "Failed to create video room. Please check HMS configuration.",
        details: hmsError.response?.data?.message || hmsError.message,
      });
    }

    const roomId = (room?.id || room?.data?.id || room?.name) as string;
    if (!roomId) {
      console.error("No room ID returned from HMS. Response:", room);
      return res.status(500).json({
        error: "Failed to create room: No room ID returned",
        details: "The HMS service did not return a valid room identifier",
      });
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
    res
      .status(500)
      .json({ error: err.message || "Failed to create video session" });
  }
};

export const getVideoToken = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user!.id;
    const { session_id, booking_id, role = "guest", user_name } = req.body;
    if (!session_id) {
      return res.status(400).json({
        error:
          "Legacy token flow is deprecated. session_id and booking_id are required.",
        code: "SESSION_ID_REQUIRED",
      });
    }

    if (!booking_id) {
      return res
        .status(400)
        .json({ error: "booking_id is required", code: "BOOKING_ID_REQUIRED" });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("video_sessions")
      .select("id, room_id, initiator_id, receiver_id, status")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session)
      return res
        .status(404)
        .json({ error: "Session not found", code: "SESSION_NOT_FOUND" });

    if (session.initiator_id !== user_id && session.receiver_id !== user_id) {
      return res
        .status(403)
        .json({
          error: "Not authorized for this session",
          code: "SESSION_FORBIDDEN",
        });
    }

    if (session.status === "ended") {
      return res
        .status(400)
        .json({ error: "Session has ended", code: "SESSION_ENDED" });
    }

    const peerId =
      session.initiator_id === user_id
        ? session.receiver_id
        : session.initiator_id;
    const access = await checkDirectInteractionAccess({
      actorId: user_id,
      peerId,
      channel: "video",
      bookingId: booking_id,
    });
    if (!access.ok) {
      return res
        .status(access.status)
        .json({
          error: access.error,
          code: access.code || "INTERACTION_FORBIDDEN",
        });
    }

    const roomId = session.room_id;

    const token = hmsService.generateAuthToken({
      room_id: roomId,
      user_id,
      role,
      user_name,
    });

    if (session.status === "pending") {
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

    res.json({ token, room_id: roomId, session_id });
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
