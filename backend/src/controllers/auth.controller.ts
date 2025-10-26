import { Request, Response } from "express";
import { sendMail } from "../services/email.service.js";
import { supabase, supabaseAdmin } from "../configs/supabase.js";
/**
 * register:
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, role = "mother", language = "en" } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    // Create user via admin API
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false // let user verify
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

    // Trigger Supabase verification email: use anon client to request magic link (email)
    try {
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: undefined }});
    } catch (e) {
      // continue - Supabase may already send by default via admin.createUser depending on settings
      console.warn("signInWithOtp warning:", e);
    }

    // Send a friendly email telling user to check their inbox for verification
    const html = `
      <p>Welcome to BellyTalk,</p>
      <p>Thanks for signing up. We sent a verification email — please check your inbox (and spam) and click the verification link to activate your account.</p>
      <p>If you didn't receive an email, you can request a new verification link from the app.</p>
      <p>— BellyTalk</p>
    `;
    try {
      await sendMail(email, "Welcome to BellyTalk — verify your email", html);
    } catch (mailErr) {
      console.warn("Failed to send custom welcome email:", mailErr);
    }

    return res.status(201).json({ message: "User created. Check email for verification.", userId });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * login:
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
