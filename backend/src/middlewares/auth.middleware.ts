import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../configs/supabase";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: "Invalid authorization header" });

    const token = parts[1];

    // Using the admin client to get user info from token
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired token" });

    req.user = {
      id: data.user.id,
      email: (data.user.email as string) || undefined
    };

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ error: "Internal auth error" });
  }
};
