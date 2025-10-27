import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { uploadFile } from "./upload.controller.js"; // your existing function

/**
 * Create or return an existing conversation between requester and participantId.
 */
export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { participantId } = req.body;

    if (userId === participantId) return res.status(400).json({ error: "Cannot create conversation with yourself" });

    // Check existing conversation (either order of participants)
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .or(
        `and(participant_a.eq.${userId},participant_b.eq.${participantId}),and(participant_a.eq.${participantId},participant_b.eq.${userId})`
      )
      .limit(1)
      .maybeSingle();

    if (existErr) throw existErr;

    if (existing) return res.status(200).json({ conversation: existing });

    // Create new conversation
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .insert([{ participant_a: userId, participant_b: participantId }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ conversation: data });
  } catch (err: any) {
    console.error("createConversation error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

/**
 * List conversations for current user
 */
export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("id, participant_a, participant_b, last_message, last_message_at, created_at")
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    res.json({ conversations: data });
  } catch (err: any) {
    console.error("listConversations error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

// Helper: upload a single Multer file using your uploadFile function
const uploadBufferToCloudinary = async (file: Express.Multer.File, folder: string) => {
  // create a fake req object expected by uploadFile
  const fakeReq = {
    file,
    body: { folder }
  } as unknown as Request;

  // fake res to capture JSON result
  const resProxy = {
    status: (_n: number) => resProxy,
    json: (payload: any) => payload
  } as any;

  // call uploadFile (it expects (req,res))
  const result = await new Promise<any>((resolve, reject) => {
    try {
      (uploadFile as any)(fakeReq, {
        status: (s: number) => ({ json: (d: any) => resolve(d) })
      } as any);
    } catch (e) {
      reject(e);
    }
  });

  // result.result is Cloudinary upload result
  return result?.result || null;
};

/**
 * Send message with optional attachments (multipart/form-data)
 * fields: conversationId (text), content (text)
 * files: attachments (0..5)
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    // fields come from form-data (strings)
    const conversationId = req.body.conversationId as string;
    const content = (req.body.content || "") as string;
    const metadataExtra = req.body.metadata ? JSON.parse(req.body.metadata) : null;

    if (!conversationId) return res.status(400).json({ error: "conversationId required" });
    if (!content && !(req.files && (req.files as Express.Multer.File[]).length)) {
      return res.status(400).json({ error: "Either content or at least one attachment is required" });
    }

    // Validate conversation exists and participants
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("id, participant_a, participant_b")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) return res.status(404).json({ error: "Conversation not found" });

    const receiverId = conv.participant_a === senderId ? conv.participant_b : conv.participant_a;
    if (!receiverId) return res.status(400).json({ error: "Invalid conversation participants" });

    // Handle attachments uploads (if any)
    const attachments: any[] = [];
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length) {
      for (const file of files) {
        // upload file to Cloudinary using existing uploadFile helper
        const uploaded = await uploadBufferToCloudinary(file, `bellytalk/message_attachments/${conversationId}`);
        if (uploaded) {
          attachments.push({
            url: uploaded.secure_url,
            public_id: uploaded.public_id,
            resource_type: uploaded.resource_type,
            format: uploaded.format,
            bytes: uploaded.bytes,
            original_filename: file.originalname
          });
        }
      }
    }

    // Build metadata
    const metadata: any = metadataExtra || {};
    if (attachments.length) metadata.attachments = attachments;

    // Insert message (use admin client)
    const { data: message, error: msgErr } = await supabaseAdmin
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          receiver_id: receiverId,
          content: content || null,
          metadata,
        }
      ])
      .select()
      .single();

    if (msgErr) throw msgErr;

    // Update conversation last message
    await supabaseAdmin
      .from("conversations")
      .update({ last_message: content || (attachments.length ? "[attachment]" : null), last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    res.status(201).json({ message });
  } catch (err: any) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

/**
 * Cursor-based pagination for messages.
 * Query params:
 *  - limit (default 50)
 *  - before (ISO timestamp string) => get messages older than 'before' (descending time)
 *  - after (ISO timestamp string)  => get messages newer than 'after' (ascending time)
 *
 * If neither provided, returns latest N messages (descending by created_at) and next_cursor = earliest returned created_at.
 */
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.conversationId;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const before = req.query.before as string | undefined;
    const after = req.query.after as string | undefined;

    // Validate conversation and participant
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("participant_a, participant_b")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) return res.status(404).json({ error: "Conversation not found" });
    if (conv.participant_a !== userId && conv.participant_b !== userId) return res.status(403).json({ error: "Forbidden" });

    let query = supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId);

    // Fetch older messages than `before` (for infinite scroll up)
    if (before) {
      // get messages with created_at < before, most recent first
      query = query.lt("created_at", before).order("created_at", { ascending: false }).limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      // return in chronological order (oldest first)
      const ordered = (data || []).reverse();
      const nextCursor = ordered.length ? ordered[0].created_at : null; // earliest returned message's created_at
      return res.json({ messages: ordered, next_cursor: nextCursor, direction: "backward" });
    }

    // Fetch newer messages than `after` (for live loading)
    if (after) {
      query = query.gt("created_at", after).order("created_at", { ascending: true }).limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      const nextCursor = data.length ? data[data.length - 1].created_at : null;
      return res.json({ messages: data, next_cursor: nextCursor, direction: "forward" });
    }

    // Default: return latest `limit` messages (for initial load)
    {
      const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      // return in chronological order (oldest first)
      const ordered = (data || []).reverse();
      const prevCursor = ordered.length ? ordered[0].created_at : null; // earliest message returned
      const nextCursor = ordered.length ? ordered[ordered.length - 1].created_at : null; // latest message returned
      return res.json({ messages: ordered, prev_cursor: prevCursor, next_cursor: nextCursor, direction: "initial" });
    }
  } catch (err: any) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

/**
 * Mark messages as seen by the current user in a conversation (optional)
 */
export const markMessagesSeen = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    await supabaseAdmin
      .from("messages")
      .update({ seen: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", userId)
      .is("seen", false);

    res.json({ message: "Marked as seen" });
  } catch (err: any) {
    console.error("markMessagesSeen error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};
