import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";
import { supabaseAdmin } from "../configs/supabase.js";

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uid = req.user!.id;
    const { data, error } = await supabaseAdmin.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (error) return res.status(500).json({ error: "Failed to check role" });
    if (!data || data.role !== "admin") return res.status(403).json({ error: "Admin only" });
    return next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    return res.status(500).json({ error: "Internal" });
  }
};
