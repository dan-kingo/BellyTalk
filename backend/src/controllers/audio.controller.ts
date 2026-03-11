import { Request, Response } from "express";
import { agoraService } from "../services/agora.service.js";
import { supabase, supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { checkDirectInteractionAccess } from "../services/booking-access.service.js";

/**
 * POST /api/audio/create
 * Body: { receiver_id: string, channel_name?: string }
 */ // In your audio.controller.ts - update createSession function
export const createSession = async (req: AuthRequest, res: Response) => {
  console.log("🎯 CREATE SESSION REQUEST:", {
    user: req.user?.id,
    body: req.body,
  });

  try {
    const initiatorId = req.user!.id;
    const {
      receiver_id,
      channel_name,
      call_type = "audio",
      booking_id,
    } = req.body;

    if (!receiver_id) {
      console.warn("❌ Missing receiver_id");
      return res
        .status(400)
        .json({ error: "receiver_id required", code: "RECEIVER_ID_REQUIRED" });
    }

    const requestedChannel = call_type === "video" ? "video" : "audio";
    const access = await checkDirectInteractionAccess({
      actorId: initiatorId,
      peerId: receiver_id,
      channel: requestedChannel,
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

    // Validate receiver exists
    console.log("🔍 Validating receiver:", { receiver_id });
    const { data: receiver, error: receiverError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", receiver_id)
      .single();

    if (receiverError || !receiver) {
      console.error("❌ Receiver not found:", receiverError);
      return res
        .status(404)
        .json({ error: "Receiver user not found", code: "RECEIVER_NOT_FOUND" });
    }

    console.log("✅ Receiver validated:", receiver);

    // Create Agora channel tokens
    console.log("🚀 Creating Agora channel...");
    const channelInfo = await agoraService.createChannelTokens(
      initiatorId,
      channel_name,
    );

    console.log("📋 Agora channel created:", {
      channelName: channelInfo.channelName,
      uid: channelInfo.uid,
    });

    // Create session record
    console.log("💾 Creating session record...");
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
      console.error("❌ Session creation failed:", error);
      return res.status(500).json({
        error: "Failed to create session in database",
        details: error.message,
        code: "DATABASE_ERROR",
      });
    }

    console.log("✅ Session created successfully:", session.id);

    // Manually add user info to response
    const responseData = {
      session: {
        ...session,
        initiator: {
          id: initiatorId,
          email: req.user?.email,
          full_name: req.user?.full_name,
        },
        receiver: {
          id: receiver.id,
          email: receiver.email,
          full_name: receiver.full_name,
        },
      },
      channel: {
        name: channelInfo.channelName,
        uid: channelInfo.uid,
      },
    };

    res.status(201).json(responseData);
  } catch (err: any) {
    console.error("❌ createSession error:", err);
    res.status(500).json({
      error: "Internal server error",
      code: "SESSION_CREATION_FAILED",
    });
  }
};

/**
 * POST /api/audio/token
 * Body: { session_id?: string, channel_name?: string, role?: 'publisher'|'subscriber', user_name?: string }
 */
// In your backend audio.controller.ts - getAuthToken function
export const getAuthToken = async (req: AuthRequest, res: Response) => {
  console.log("🎯 GET AUTH TOKEN REQUEST:", {
    user: req.user?.id,
    body: req.body,
  });

  try {
    const { session_id, booking_id, role = "publisher" } = req.body;
    const user_id = req.user!.id;

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

    let channelName: string;
    let uid: number;
    let session = null;

    console.log("🔍 Fetching session:", { session_id });

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("audio_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !sessionData) {
      console.error("❌ Session not found:", sessionError);
      return res
        .status(404)
        .json({ error: "Session not found", code: "SESSION_NOT_FOUND" });
    }

    session = sessionData;
    channelName = sessionData.channel_name;

    if (
      sessionData.initiator_id !== user_id &&
      sessionData.receiver_id !== user_id
    ) {
      console.warn("🚫 Unauthorized access attempt:", {
        user_id,
        session_id,
      });
      return res.status(403).json({ error: "Not authorized for this session" });
    }

    if (sessionData.status === "ended") {
      console.warn("📵 Session already ended:", { session_id });
      return res
        .status(400)
        .json({ error: "Session has ended", code: "SESSION_ENDED" });
    }

    const peerId =
      sessionData.initiator_id === user_id
        ? sessionData.receiver_id
        : sessionData.initiator_id;
    const channel = sessionData.call_type === "video" ? "video" : "audio";
    const access = await checkDirectInteractionAccess({
      actorId: user_id,
      peerId,
      channel,
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

    // Keep initiator UID stable, receiver gets a unique UID.
    if (sessionData.initiator_id === user_id) {
      uid = sessionData.uid;
      console.log("🎯 Initiator using session UID:", uid);
    } else {
      uid = Math.floor(Math.random() * 100000);
      console.log("🎯 Receiver generated new UID:", uid);
    }

    // Generate tokens
    console.log("🔧 Generating tokens...", { channelName, uid, role });
    const rtcToken = await agoraService.generateRtcToken(
      channelName,
      uid,
      role as any,
    );
    const rtmToken = await agoraService.generateRtmToken(user_id.toString());

    console.log("✅ Tokens generated:", {
      uid: uid,
      channelName: channelName,
      userRole: session?.initiator_id === user_id ? "initiator" : "receiver",
    });

    // Update session status if receiver is joining
    if (
      session &&
      session.status === "pending" &&
      session.initiator_id !== user_id
    ) {
      console.log("🔄 Receiver joined - updating session status to active");
      await supabaseAdmin
        .from("audio_sessions")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id);
    }

    res.json({
      rtcToken,
      rtmToken,
      channelName,
      uid,
      session_id: session_id || null,
    });
  } catch (err: any) {
    console.error("❌ getAuthToken error:", err);
    res.status(500).json({
      error: err.message ?? "Server error",
      code: "TOKEN_GENERATION_FAILED",
    });
  }
};
/**
 * POST /api/audio/end/:session_id
 */
export const endSession = async (req: AuthRequest, res: Response) => {
  console.log("🎯 END SESSION REQUEST:", {
    user_id: req.user?.id,
    session_id: req.params.session_id,
    full_user: req.user, // Log entire req.user object
  });

  try {
    const { session_id } = req.params;
    const user_id = req.user!.id;

    // Fetch session
    const { data: session, error: fetchErr } = await supabase
      .from("audio_sessions")
      .select("id, initiator_id, receiver_id, status")
      .eq("id", session_id)
      .single();

    if (fetchErr || !session) {
      console.error("❌ Session not found:", fetchErr);
      return res
        .status(404)
        .json({ error: "Session not found", code: "SESSION_NOT_FOUND" });
    }

    // Auth check
    if (session.initiator_id !== user_id && session.receiver_id !== user_id) {
      console.warn("🚫 UNAUTHORIZED:", {
        user_id,
        expected: [session.initiator_id, session.receiver_id],
      });
      return res.status(403).json({
        error: "Not authorized to end this session",
        code: "SESSION_FORBIDDEN",
      });
    }

    // Update (triggers WebSocket)
    const updates = {
      status: "ended",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: updatedSession, error } = await supabase
      .from("audio_sessions")
      .update(updates)
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      console.error("❌ Update failed:", error);
      return res.status(500).json({
        error: "Failed to end session",
        code: "SESSION_END_FAILED",
      });
    }

    console.log("✅ Session ended - WebSocket fired!");
    res.json({ session: updatedSession });
  } catch (err: any) {
    console.error("endSession error:", err);
    res.status(500).json({ error: err.message });
  }
};
/**
 * GET /api/audio/session/:session_id
 */
export const getSession = async (req: AuthRequest, res: Response) => {
  console.log("🎯 GET SESSION REQUEST:", {
    user: req.user?.id,
    params: req.params,
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
      console.error("❌ Session not found:", error);
      return res
        .status(404)
        .json({ error: "Session not found", code: "SESSION_NOT_FOUND" });
    }

    // Check authorization
    if (session.initiator_id !== user_id && session.receiver_id !== user_id) {
      console.warn("🚫 Unauthorized session access:", { user_id, session_id });
      return res
        .status(403)
        .json({
          error: "Not authorized to view this session",
          code: "SESSION_FORBIDDEN",
        });
    }

    console.log("✅ Session retrieved:", session_id);

    // Get user details separately
    const [initiatorResult, receiverResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", session.initiator_id)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", session.receiver_id)
        .single(),
    ]);

    const sessionWithUsers = {
      ...session,
      initiator: initiatorResult.data,
      receiver: receiverResult.data,
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
  console.log("🎯 GET CHANNEL INFO:", {
    params: req.params,
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
      exists: userCount >= 0,
    });
  } catch (err: any) {
    console.error("❌ getChannelInfo error:", err);
    res.status(500).json({ error: err.message ?? "Server error" });
  }
};

/**
 * GET /api/audio/history
 * Query: call_type=audio|video, limit=number
 */
export const listSessionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const callType =
      typeof req.query.call_type === "string" ? req.query.call_type : undefined;
    const requestedLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 20;

    let query = supabaseAdmin
      .from("audio_sessions")
      .select(
        "id, initiator_id, receiver_id, channel_name, call_type, status, created_at, started_at, ended_at",
      )
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (callType === "audio" || callType === "video") {
      query = query.eq("call_type", callType);
    }

    const { data: sessions, error } = await query;
    if (error) throw error;

    const otherUserIds = Array.from(
      new Set(
        (sessions || []).map((session) =>
          session.initiator_id === userId
            ? session.receiver_id
            : session.initiator_id,
        ),
      ),
    );

    const profileMap = new Map<
      string,
      { id: string; full_name: string; email: string; avatar_url?: string }
    >();

    if (otherUserIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", otherUserIds);

      if (profileError) throw profileError;

      for (const profile of profiles || []) {
        profileMap.set(profile.id, profile);
      }
    }

    const history = (sessions || []).map((session) => {
      const counterpartId =
        session.initiator_id === userId
          ? session.receiver_id
          : session.initiator_id;
      const counterpart = profileMap.get(counterpartId) || null;

      return {
        ...session,
        direction: session.initiator_id === userId ? "outgoing" : "incoming",
        counterpart,
      };
    });

    return res.json({ sessions: history });
  } catch (err: any) {
    console.error("listSessionHistory error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
