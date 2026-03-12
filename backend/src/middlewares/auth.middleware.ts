import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin } from "../configs/supabase.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
  };
}

const TRANSIENT_NETWORK_CODES = [
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
];

const isTransientSupabaseNetworkError = (error: any): boolean => {
  const causeCode = error?.cause?.code;
  const directCode = error?.code;
  const message = String(error?.message || "").toLowerCase();

  return (
    TRANSIENT_NETWORK_CODES.includes(causeCode) ||
    TRANSIENT_NETWORK_CODES.includes(directCode) ||
    message.includes("fetch failed") ||
    message.includes("connect timeout")
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getUserWithRetry = async (token: string, attempts = 2) => {
  let lastError: any = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await supabaseAdmin.auth.getUser(token);

      if (result.error && isTransientSupabaseNetworkError(result.error)) {
        lastError = result.error;
      } else {
        return result;
      }
    } catch (error) {
      if (!isTransientSupabaseNetworkError(error)) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < attempts) {
      // Short jittered backoff to survive brief DNS or connect timeout spikes.
      const backoffMs = 150 * attempt + Math.floor(Math.random() * 120);
      await sleep(backoffMs);
    }
  }

  throw lastError;
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "Missing authorization header" });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res.status(401).json({ error: "Invalid authorization header" });

    const token = parts[1];

    // Using the admin client to get user info from token.
    const { data, error } = await getUserWithRetry(token);
    if (error || !data?.user)
      return res.status(401).json({ error: "Invalid or expired token" });

    req.user = {
      id: data.user.id,
      email: (data.user.email as string) || undefined,
    };

    return next();
  } catch (err) {
    if (isTransientSupabaseNetworkError(err)) {
      return res.status(503).json({
        error:
          "Authentication service is temporarily unavailable. Please retry shortly.",
      });
    }

    console.error("Auth middleware error:", err);
    return res.status(500).json({ error: "Internal auth error" });
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !profile)
        return res.status(403).json({ error: "Profile not found" });
      if (!roles.includes(profile.role))
        return res.status(403).json({ error: "Forbidden: insufficient role" });

      next();
    } catch (err) {
      res.status(500).json({ error: "Server error in role check" });
    }
  };
};
