import { Request, Response } from "express";
import { agoraService } from "../services/agora.service.js";
import { supabase, supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

/**
 * POST /api/audio/create
 * Body: { receiver_id: string, channel_name?: string }
 */// In your audio.controller.ts - update createSession function
export const createSession = async (req: AuthRequest, res: Response) => {
  console.log('🎯 CREATE SESSION REQUEST:', {
    user: req.user?.id,
    body: req.body
  });

  try {
    const initiatorId = req.user!.id;
    const { receiver_id, channel_name, call_type = 'audio' } = req.body; // Add call_type
    
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
    const channelInfo = await agoraService.createChannelTokens(initiatorId, channel_name);
    
    console.log('📋 Agora channel created:', {
      channelName: channelInfo.channelName,
      uid: channelInfo.uid
    });

    // Create session record
    console.log('💾 Creating session record...');
    const sessionData = {
      initiator_id: initiatorId,
      receiver_id,
      channel_name: channelInfo.channelName,
      uid: channelInfo.uid,
      call_type, // Add call_type: 'audio' or 'video'
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: session, error } = await supabaseAdmin
      .from("audio_sessions") // Keep same table for now
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Session creation failed:', error);
      return res.status(500).json({ 
        error: "Failed to create session in database",
        details: error.message,
        code: "DATABASE_ERROR"
      });
    }

    console.log('✅ Session created successfully:', session.id);

    // Manually add user info to response
    const responseData = {
      session: {
        ...session,
        initiator: { 
          id: initiatorId, 
          email: req.user?.email, 
          full_name: req.user?.full_name 
        },
        receiver: { 
          id: receiver.id, 
          email: receiver.email, 
          full_name: receiver.full_name 
        }
      },
      channel: {
        name: channelInfo.channelName,
        uid: channelInfo.uid
      }
    };

    res.status(201).json(responseData);

  } catch (err: any) {
    console.error("❌ createSession error:", err);
    res.status(500).json({ 
      error: "Internal server error",
      code: "SESSION_CREATION_FAILED"
    });
  }
};

/**
 * POST /api/audio/token
 * Body: { session_id?: string, channel_name?: string, role?: 'publisher'|'subscriber', user_name?: string }
 */
// In your backend audio.controller.ts - getAuthToken function
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
        .select("*")
        .eq("id", session_id)
        .single();

      if (sessionError || !sessionData) {
        console.error('❌ Session not found:', sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      session = sessionData;
      channelName = sessionData.channel_name;
      
      // ✅ CRITICAL FIX: Generate DIFFERENT UID for receiver
      if (sessionData.initiator_id === user_id) {
        // Initiator uses the session UID
        uid = sessionData.uid;
        console.log('🎯 Initiator using session UID:', uid);
      } else {
        // Receiver gets a NEW UID
        uid = Math.floor(Math.random() * 100000);
        console.log('🎯 Receiver generated new UID:', uid);
      }

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

    } else {
      // Generate new UID if no session (shouldn't happen in our flow)
      uid = Math.floor(Math.random() * 100000);
      console.log('📋 Generated new UID (no session):', uid);
    }

    if (!channelName) {
      console.warn('❌ Missing channel_name');
      return res.status(400).json({ error: "channel_name or valid session_id required" });
    }

    // Generate tokens
    console.log('🔧 Generating tokens...', { channelName, uid, role });
    const rtcToken = await agoraService.generateRtcToken(channelName, uid, role as any);
    const rtmToken = await agoraService.generateRtmToken(user_id.toString());

    console.log('✅ Tokens generated:', {
      uid: uid,
      channelName: channelName,
      userRole: session?.initiator_id === user_id ? 'initiator' : 'receiver'
    });

    // Update session status if receiver is joining
    if (session_id && session && session.status === 'pending' && session.initiator_id !== user_id) {
      console.log('🔄 Receiver joined - updating session status to active');
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
  const rawSessionId = req.params.session_id;
  const session_id = (rawSessionId || "").trim();

  console.log('🔍 RAW session_id from URL:', JSON.stringify(rawSessionId));
  console.log('🔍 TRIMMED session_id:', JSON.stringify(session_id));
  console.log('🔍 Length:', session_id.length);
  console.log('🔍 Is valid UUID?', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session_id));

  if (!session_id || session_id.length !== 36) {
    return res.status(400).json({ error: "Invalid session_id" });
  }

  const user_id = req.user!.id;
  console.log('👤 Current user_id (auth.uid):', user_id);

  try {
    // First: Try query with supabase (authenticated)
    const { data: session, error, count } = await supabase
      .from("audio_sessions")
      .select("id, initiator_id, receiver_id, status", { count: 'exact' })
      .eq("id", session_id);

    console.log('🔍 Supabase query result:', { session, error, count });

    if (!session || session.length === 0) {
      // Fallback: Try with supabaseAdmin (bypass RLS)
      const { data: adminSession } = await supabaseAdmin
        .from("audio_sessions")
        .select("id, initiator_id, receiver_id")
        .eq("id", session_id)
        .single();

      console.log('🔧 Admin query result (bypass RLS):', adminSession ? 'FOUND' : 'NOT FOUND');
      if (!adminSession) {
        return res.status(404).json({ error: "Session does not exist in DB" });
      }

      return res.status(403).json({ 
        error: "RLS blocked access", 
        debug: { 
          session_id, 
          user_id, 
          initiator_id: adminSession.initiator_id,
          receiver_id: adminSession.receiver_id 
        }
      });
    }

    const s = session[0];
    if (s.initiator_id !== user_id && s.receiver_id !== user_id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update with supabase → triggers real-time
    const { data: updated } = await supabase
      .from("audio_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", session_id)
      .select()
      .single();

    console.log('CALL ENDED → WebSocket should fire');
    res.json({ session: updated });

  } catch (err: any) {
    console.error("endSession error:", err);
    res.status(500).json({ error: err.message });
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

    // Simple select without joins
    const { data: session, error } = await supabaseAdmin
      .from("audio_sessions")
      .select("*")
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

    // Get user details separately
    const [initiatorResult, receiverResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', session.initiator_id)
        .single(),
      supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', session.receiver_id)
        .single()
    ]);

    const sessionWithUsers = {
      ...session,
      initiator: initiatorResult.data,
      receiver: receiverResult.data
    };

    res.json({ session: sessionWithUsers });
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