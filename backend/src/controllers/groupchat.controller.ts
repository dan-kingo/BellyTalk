import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, description } = req.body;

    const { data, error } = await supabaseAdmin
      .from("group_rooms")
      .insert([{ name, description, created_by: userId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ group: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listGroups = async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("group_rooms")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ groups: data });
};

export const joinGroup = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { roomId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("group_participants")
      .insert([{ room_id: roomId, user_id: userId }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505")
        return res.status(200).json({ message: "Already joined" });
      throw error;
    }
    res.json({ participant: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { roomId } = req.params;
    const { message, attachments } = req.body;

    const { data, error } = await supabaseAdmin
      .from("group_messages")
      .insert([{ room_id: roomId, sender_id: senderId, message, attachments }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("group_messages")
      .select("*, profiles(full_name, avatar_url)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json({ messages: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
