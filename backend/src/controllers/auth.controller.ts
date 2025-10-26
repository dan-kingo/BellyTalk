import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../configs/supabase";

/**
 * register:
 * - create user via service_role admin.createUser
 * - insert a profile row in public.profiles using service client
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, role = "mother", language = "en" } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    // Create user via admin API
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      console.error("create user error:", createError);
      return res.status(400).json({ error: createError.message });
    }

    const userId = createData.user?.id;
    if (!userId) return res.status(500).json({ error: "Failed to create user" });

    // Insert profile row
    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert([
        {
          id: userId,
          email,
          full_name,
          role,
          language
        }
      ]);

    if (insertError) {
      console.error("insert profile error:", insertError);
      return res.status(500).json({ error: "Failed to create profile" });
    }

    return res.status(201).json({ message: "User created", userId });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * login:
 * - use anon client to sign in and return session (access_token + user)
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || "Invalid credentials" });
    }

    return res.status(200).json({ session: data.session, user: data.user });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * logout - revoke session on server (optional), client can just drop token
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // If client uses access_token, you can revoke via admin or client as appropriate
    // For now respond success (client should remove token)
    return res.status(200).json({ message: "Logged out (client should drop token)" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
