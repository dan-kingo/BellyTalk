import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase.js";

export const sendVideoMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { session_id, content } = req.body;
    if (!session_id || !content) return res.status(400).json({ error: "Missing fields" });

    const { data, error } = await supabaseAdmin
      .from("video_messages")
      .insert([{ session_id, sender_id: senderId, content }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listVideoMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("video_messages")
      .select("*, profiles!video_messages_sender_id_fkey(full_name, avatar_url)")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    res.json({ messages: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
