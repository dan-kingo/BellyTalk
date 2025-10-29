import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

/**
 * GET /api/admin/panel/overview
 * Platform analytics summary
 */
export const getOverview = async (req: AuthRequest, res: Response) => {
  try {
    const [{ count: users }, { count: contents }, { count: messages }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("educational_content").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("group_messages").select("*", { count: "exact", head: true }),
    ]);

    res.json({
      users,
      contents,
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/panel/users
 */
export const listUsers = async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role, role_status, created_at")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
};

/**
 * DELETE /api/admin/panel/users/:id
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from("profiles").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "User deleted" });
};

/**
 * GET /api/admin/panel/logs
 */
export const getLogs = async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data });
};
