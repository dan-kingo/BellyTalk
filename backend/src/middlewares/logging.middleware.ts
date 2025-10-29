import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../configs/supabase.js";

export const logActivity = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id || null;
  const log = {
    user_id: userId,
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  };

  try {
    await supabaseAdmin.from("activity_logs").insert([log]);
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }

  next();
};
