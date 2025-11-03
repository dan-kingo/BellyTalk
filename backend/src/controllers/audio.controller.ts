import { Request, Response } from "express";
import { agoraService } from "../services/agora.service.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

/**
 * POST /api/audio/create
 * Body: { receiver_id: string, channel_name?: string }
 */
export const createSession = async (req: AuthRequest, res: Response) => {
  console.log('🎯 CREATE SESSION REQUEST:', {
    user: req.user?.id,
    body: req.body
  });

  try {
    const initiatorId = req.user!.id;
    const { receiver_id, channel_name } = req.body;
    
    if (!receiver_id) {
      console.warn('❌ Missing receiver_id');
      return res.status(400).json({ error: "receiver_id required" });
    }

    // Validate receiver exists
    console.log('🔍 Validating receiver:', { receiver_id });
    const { data: receiver, error: receiverError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', receiver_id)
      .single();

    if (receiverError || !receiver) {
      console.error('❌ Receiver not found:', receiverError);
      return res.status(404).json({ error: "Receiver user not found" });
    }

    console.log('✅ Receiver validated:', receiver);

    // Create Agora channel tokens
    console.log('🚀 Creating Agora channel...');
    const channelInfo = agoraService.createChannelTokens(initiatorId, channel_name);
    
    console.log('📋 Agora channel created:', {
      channelName: channelInfo.channelName,
      uid: channelInfo.uid
    });

    // Create session record
    console.log('💾 Creating session record...');
    const { data: session, error } = await supabaseAdmin
      .from("audio_sessions")
      .insert([
        {
          initiator_id: initiatorId,
          receiver_id,
          channel_name: channelInfo.channelName,
          uid: channelInfo.uid,
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
      console.error('❌ Session creation failed:', error);
      throw error;
    }

    console.log('✅ Session created successfully:', session.id);

    res.status(201).json({ 
      session,
      channel: {
        name: channelInfo.channelName,
        uid: channelInfo.uid
      }
    });
  } catch (err: any) {
    console.error("❌ createSession error:", err);
    res.status(500).json({ 
      error: err.message ?? "Server error",
      code: "SESSION_CREATION_FAILED"
    });
  }
};

/**
 * POST /api/audio/token
 * Body: { session_id?: string, channel_name?: string, role?: 'publisher'|'subscriber', user_name?: string }
 */
export const getAuthToken = async (req: AuthRequest, res: Response) => {
  console.log('🎯 GET AUTH TOKEN REQUEST:', {
    user: req.user?.id,
    body: req.body
  });

  try {
    const { session_id, channel_name, role = "publisher", user_name } = req.body;
    const user_id = req.user!.id;

    let channelName = channel_name;
    let uid: number;
    let session = null;

    // If session_id provided, get channel_name and validate session
    if (session_id) {
      console.log('🔍 Fetching session:', { session_id });
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
        console.error('❌ Session not found:', sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      session = sessionData;
      channelName = sessionData.channel_name;
      uid = sessionData.uid;

      // Check if user is authorized for this session
      if (sessionData.initiator_id !== user_id && sessionData.receiver_id !== user_id) {
        console.warn('🚫 Unauthorized access attempt:', { user_id, session_id });
        return res.status(403).json({ error: "Not authorized for this session" });
      }

      // Check if session is active
      if (sessionData.status === 'ended') {
        console.warn('📵 Session already ended:', { session_id });
        return res.status(400).json({ error: "Session has ended" });
      }

      console.log('✅ Session validated:', { channelName, uid });
    } else {
      // Generate new UID if no session
      uid = agoraService.generateUid();
    }

    if (!channelName) {
      console.warn('❌ Missing channel_name');
      return res.status(400).json({ error: "channel_name or valid session_id required" });
    }

    // Validate channel (Agora channels are created on-demand)
    console.log('🔍 Validating channel:', { channelName });
    const channelValid = await agoraService.validateChannel(channelName);
    if (!channelValid) {
      console.error('❌ Channel validation failed:', { channelName });
      return res.status(404).json({ error: "Audio channel not available" });
    }

    // Generate tokens
    console.log('🔧 Generating tokens...', { channelName, uid, role });
    const rtcToken = agoraService.generateRtcToken(channelName, uid, role as any);
    const rtmToken = agoraService.generateRtmToken(user_id.toString());

    console.log('✅ Tokens generated:', {
      rtcTokenLength: rtcToken.length,
      rtmTokenLength: rtmToken.length
    });

    // Update session status if this is the first token generation
    if (session_id && session && session.status === 'pending') {
      console.log('🔄 Updating session status to active:', { session_id });
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
      rtcToken,
      rtmToken,
      channelName,
      uid,
      session_id: session_id || null
    });
  } catch (err: any) {
    console.error("❌ getAuthToken error:", err);
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
  console.log('🎯 END SESSION REQUEST:', {
    user: req.user?.id,
    params: req.params,
    body: req.body
  });

  try {
    const { session_id } = req.params;
    const { recording_url, summary } = req.body;
    const user_id = req.user!.id;

    // Get and validate session
    console.log('🔍 Fetching session to end:', { session_id });
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from("audio_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (fetchErr || !session) {
      console.error('❌ Session not found:', fetchErr);
      return res.status(404).json({ error: "Session not found" });
    }

    // Check authorization
    if (session.initiator_id !== user_id && session.receiver_id !== user_id) {
      console.warn('🚫 Unauthorized end session attempt:', { user_id, session_id });
      return res.status(403).json({ error: "Not authorized to end this session" });
    }

    console.log('✅ Authorization verified, ending session...');

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

    if (error) {
      console.error('❌ Session update failed:', error);
      throw error;
    }

    console.log('✅ Session ended successfully:', session_id);

    res.json({ session: data });
  } catch (err: any) {
    console.error("❌ endSession error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};

/**
 * GET /api/audio/session/:session_id
 */
export const getSession = async (req: AuthRequest, res: Response) => {
  console.log('🎯 GET SESSION REQUEST:', {
    user: req.user?.id,
    params: req.params
  });

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
      console.error('❌ Session not found:', error);
      return res.status(404).json({ error: "Session not found" });
    }

    // Check authorization
    if (session.initiator_id !== user_id && session.receiver_id !== user_id) {
      console.warn('🚫 Unauthorized session access:', { user_id, session_id });
      return res.status(403).json({ error: "Not authorized to view this session" });
    }

    console.log('✅ Session retrieved:', session_id);

    res.json({ session });
  } catch (err: any) {
    console.error("❌ getSession error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};

/**
 * GET /api/audio/channel-info/:channel_name
 * Get channel information and user count
 */
export const getChannelInfo = async (req: Request, res: Response) => {
  console.log('🎯 GET CHANNEL INFO:', {
    params: req.params
  });

  try {
    const { channel_name } = req.params;

    if (!channel_name) {
      return res.status(400).json({ error: "channel_name required" });
    }

    const userCount = await agoraService.getChannelUserCount(channel_name);

    res.json({
      channelName: channel_name,
      userCount,
      exists: userCount >= 0
    });
  } catch (err: any) {
    console.error("❌ getChannelInfo error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};