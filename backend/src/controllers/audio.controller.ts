// src/controllers/audio.controller.ts
import { Request, Response } from "express";
import { hmsService } from "../services/hms.service.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

/**
 * POST /api/audio/create
 * Body: { receiver_id: string, template_id?: string, region?: string }
 * Creates a 100ms room (or uses existing mapping) and creates an audio_sessions record
 */
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const initiatorId = req.user!.id;
    const { receiver_id, template_id, region } = req.body;
    if (!receiver_id) return res.status(400).json({ error: "receiver_id required" });

    const roomPayload: any = {
      name: `audio-${initiatorId}-${receiver_id}-${Date.now()}`,
      description: `1:1 audio between ${initiatorId} and ${receiver_id}`,
    };
    if (template_id) roomPayload.template_id = template_id;
    if (region) roomPayload.region = region;

    let roomRes;
    try {
      roomRes = await hmsService.createRoom(roomPayload);
    } catch (hmsError: any) {
      console.error("HMS createRoom error:", hmsError?.response?.data || hmsError.message);
      return res.status(500).json({
        error: "Failed to create audio room. Please check HMS configuration.",
        details: hmsError?.response?.data?.message || hmsError.message
      });
    }

    const roomId = (roomRes?.data?.id ?? roomRes?.id ?? roomRes?.name) as string;

    if (!roomId) {
      console.error("No room ID returned from HMS. Response:", roomRes);
      return res.status(500).json({ error: "Failed to create room: No room ID returned" });
    }

    const { data: session, error } = await supabaseAdmin
      .from("audio_sessions")
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
    res.status(201).json({ session });
  } catch (err: any) {
    console.error("createSession error:", err?.response?.data ?? err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};

/**
 * POST /api/audio/token
 * Body: { session_id?: string, room_id?: string, role: 'host'|'guest', user_name?: string }
 * Return: { token }
 */
export const getAuthToken = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, room_id, role = "guest", user_name } = req.body;
    const user_id = req.user!.id;

    // prefer session->room mapping if session_id provided
    let roomId = room_id;
    if (session_id && !roomId) {
      const { data: session } = await supabaseAdmin.from("audio_sessions").select("room_id").eq("id", session_id).maybeSingle();
      if (!session) return res.status(404).json({ error: "Session not found" });
      roomId = session.room_id;
    }

    if (!roomId) return res.status(400).json({ error: "room_id or session_id required" });

    // generate token
    const token = hmsService.generateAuthToken({
      room_id: roomId,
      user_id,
      role,
      user_name,
    });

    // optionally store token on session
    if (session_id) {
      await supabaseAdmin.from("audio_sessions").update({ token, status: "active", started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", session_id);
    }

    res.json({ token, room_id: roomId });
  } catch (err: any) {
    console.error("getAuthToken error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};

/**
 * POST /api/audio/end/:session_id
 * Mark session as ended and optionally attach ended_at, summary, recording_url
 */
export const endSession = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.params;
    const { recording_url, summary } = req.body;

    const { data: session, error: fetchErr } = await supabaseAdmin.from("audio_sessions").select("*").eq("id", session_id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!session) return res.status(404).json({ error: "Session not found" });

    const updates: any = { status: "ended", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (recording_url) updates.recording_url = recording_url;
    if (summary) updates.summary = summary;

    const { data, error } = await supabaseAdmin.from("audio_sessions").update(updates).eq("id", session_id).select().maybeSingle();
    if (error) throw error;

    res.json({ session: data });
  } catch (err: any) {
    console.error("endSession error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};
