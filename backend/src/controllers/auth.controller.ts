import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../configs/supabase.js";
/**
 * register:
 */
export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      full_name,
      role = "mother",
      language = "en",
    } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    const normalizedRole = String(role).toLowerCase();
    if (!["mother", "doctor"].includes(normalizedRole)) {
      return res.status(400).json({ error: "role must be mother or doctor" });
    }

    const roleStatus = normalizedRole === "doctor" ? "pending" : "approved";

    // Create user via admin API
    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // let user verify
      });

    if (createError) {
      console.error("create user error:", createError);
      return res.status(400).json({ error: createError.message });
    }

    const userId = createData.user?.id;
    if (!userId)
      return res.status(500).json({ error: "Failed to create user" });

    // Insert profile row
    const { error: insertError } = await supabaseAdmin.from("profiles").insert([
      {
        id: userId,
        email,
        full_name,
        role: normalizedRole,
        role_status: roleStatus,
        language,
      },
    ]);

    if (insertError) {
      console.error("insert profile error:", insertError);
      return res.status(500).json({ error: "Failed to create profile" });
    }

    // Keep doctor profile verification state aligned from the first signup step.
    if (normalizedRole === "doctor") {
      const { error: doctorProfileError } = await supabaseAdmin
        .from("doctor_profiles")
        .upsert(
          {
            user_id: userId,
            verification_status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (doctorProfileError) {
        console.error("doctor profile init error:", doctorProfileError);
      }
    }

    const emailRedirectTo =
      process.env.AUTH_REDIRECT_URL ||
      process.env.FRONTEND_URL ||
      "https://bellytalkapp.com/login";

    // Use Supabase native verification email flow only.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });

    if (otpError) {
      console.warn("signInWithOtp warning:", otpError);
    }

    return res.status(201).json({
      message: "User created. Check email for verification.",
      userId,
      emailRedirectTo,
    });
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
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return res
        .status(401)
        .json({ error: error?.message || "Invalid credentials" });
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
    return res
      .status(200)
      .json({ message: "Logged out (client should drop token)" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
