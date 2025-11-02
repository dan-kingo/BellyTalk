import { Request, Response } from "express";
import { hmsService } from "../services/hms.service.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

/**
 * POST /api/audio/create
 * Body: { receiver_id: string, template_id?: string, region?: string }
 */
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const initiatorId = req.user!.id;
    const { receiver_id, template_id, region } = req.body;
    
    if (!receiver_id) {
      return res.status(400).json({ error: "receiver_id required" });
    }

    // Validate receiver exists
    const { data: receiver, error: receiverError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', receiver_id)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ error: "Receiver user not found" });
    }

    const roomPayload = {
      name: `audio-${initiatorId}-${receiver_id}-${Date.now()}`,
      description: `Audio call between users`,
      template_id: template_id || process.env.HMS_TEMPLATE_ID,
      region: region || 'us'
    };

    let roomRes;
    try {
      roomRes = await hmsService.createRoom(roomPayload);
      console.log('Audio room created successfully:', { roomId: roomRes.id });
    } catch (hmsError: any) {
      console.error("HMS createRoom error:", hmsError);
      return res.status(500).json({
        error: "Failed to create audio room",
        details: hmsError.message,
        code: "HMS_ROOM_CREATION_FAILED"
      });
    }

    const roomId = roomRes?.id;
    if (!roomId) {
      return res.status(500).json({
        error: "Failed to create room: No room ID returned",
        code: "NO_ROOM_ID"
      });
    }

    // Create session record
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
      .select(`
        *,
        initiator:profiles!audio_sessions_initiator_id_fk(id, email, full_name),
        receiver:profiles!audio_sessions_receiver_id_fk(id, email, full_name)
      `)
      .single();

    if (error) {
      // Clean up room if session creation fails
      try {
        // You might want to implement room deletion here
        console.warn('Session creation failed, room cleanup might be needed:', roomId);
      } catch (cleanupError) {
        console.error('Room cleanup failed:', cleanupError);
      }
      
      throw error;
    }

    res.status(201).json({ 
      session,
      room: { id: roomId, name: roomRes.name }
    });
  } catch (err: any) {
    console.error("createSession error:", err);
    res.status(500).json({ 
      error: err.message ?? "Server error",
      code: "SESSION_CREATION_FAILED"
    });
  }
};

/**
 * POST /api/audio/token
 * Body: { session_id?: string, room_id?: string, role: 'host'|'guest', user_name?: string }
 */
export const getAuthToken = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, room_id, role = "guest", user_name } = req.body;
    const user_id = req.user!.id;

    let roomId = room_id;
    let session = null;

    // If session_id provided, get room_id and validate session
    if (session_id) {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from("audio_sessions")
        .select(`
          *,
          initiator:profiles!audio_sessions_initiator_id_fk(id, email, full_name),
          receiver:profiles!audio_sessions_receiver_id_fk(id, email, full_name)
        `)
        .eq("id", session_id)
        .single();

      if (sessionError || !sessionData) {
        return res.status(404).json({ error: "Session not found" });
      }

      session = sessionData;
      roomId = sessionData.room_id;

      // Check if user is authorized for this session
      if (sessionData.initiator_id !== user_id && sessionData.receiver_id !== user_id) {
        return res.status(403).json({ error: "Not authorized for this session" });
      }

      // Check if session is active
      if (sessionData.status === 'ended') {
        return res.status(400).json({ error: "Session has ended" });
      }
    }

    if (!roomId) {
      return res.status(400).json({ error: "room_id or valid session_id required" });
    }

    // Validate room exists
    try {
      const roomValid = await hmsService.validateRoom(roomId);
      if (!roomValid) {
        return res.status(404).json({ error: "Audio room not found or inactive" });
      }
    } catch (roomError) {
      console.error('Room validation failed:', roomError);
      return res.status(500).json({ error: "Failed to validate audio room" });
    }

    // Generate token
    const token = hmsService.generateAuthToken({
      room_id: roomId,
      user_id: user_id.toString(),
      role: role,
      user_name: user_name || req.user!.email,
    });

    // Update session status if this is the first token generation
    if (session_id && session && session.status === 'pending') {
      await supabaseAdmin
        .from("audio_sessions")
        .update({ 
          status: "active", 
          started_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        })
        .eq("id", session_id);
    }

    res.json({ 
      token, 
      room_id: roomId,
      session_id: session_id || null
    });
  } catch (err: any) {
    console.error("getAuthToken error:", err);
    res.status(500).json({ 
      error: err.message ?? "Server error",
      code: "TOKEN_GENERATION_FAILED"
    });
  }
};

/**
 * POST /api/audio/end/:session_id
 */
export const endSession = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.params;
    const { recording_url, summary } = req.body;
    const user_id = req.user!.id;

    // Get and validate session
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from("audio_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (fetchErr || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check authorization
    if (session.initiator_id !== user_id && session.receiver_id !== user_id) {
      return res.status(403).json({ error: "Not authorized to end this session" });
    }

    // Update session
    const updates: any = { 
      status: "ended", 
      ended_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    };
    
    if (recording_url) updates.recording_url = recording_url;
    if (summary) updates.summary = summary;

    const { data, error } = await supabaseAdmin
      .from("audio_sessions")
      .update(updates)
      .eq("id", session_id)
      .select()
      .single();

    if (error) throw error;

    res.json({ session: data });
  } catch (err: any) {
    console.error("endSession error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};

/**
 * GET /api/audio/session/:session_id
 */
export const getSession = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.params;
    const user_id = req.user!.id;

    const { data: session, error } = await supabaseAdmin
      .from("audio_sessions")
      .select(`
        *,
        initiator:profiles!audio_sessions_initiator_id_fk(id, email, full_name),
        receiver:profiles!audio_sessions_receiver_id_fk(id, email, full_name)
      `)
      .eq("id", session_id)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check authorization
    if (session.initiator_id !== user_id && session.receiver_id !== user_id) {
      return res.status(403).json({ error: "Not authorized to view this session" });
    }

    res.json({ session });
  } catch (err: any) {
    console.error("getSession error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};