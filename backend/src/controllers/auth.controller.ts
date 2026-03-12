import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

const isTransientSupabaseNetworkError = (error: any) => {
  const causeCode = error?.cause?.code;
  const directCode = error?.code;
  const message = String(error?.message || "").toLowerCase();

  return (
    [
      "EAI_AGAIN",
      "ENOTFOUND",
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
    ].includes(causeCode) ||
    [
      "EAI_AGAIN",
      "ENOTFOUND",
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
    ].includes(directCode) ||
    message.includes("fetch failed")
  );
};

const transientSupabaseResponse = (res: Response) => {
  return res.status(503).json({
    error:
      "Auth service is temporarily unavailable. Please try again in a moment.",
  });
};
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
    if (isTransientSupabaseNetworkError(err)) {
      return transientSupabaseResponse(res);
    }
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
    if (isTransientSupabaseNetworkError(err)) {
      return transientSupabaseResponse(res);
    }
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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const redirectTo =
      process.env.AUTH_RESET_REDIRECT_URL ||
      process.env.AUTH_REDIRECT_URL ||
      process.env.FRONTEND_URL ||
      "https://bellytalkapp.com/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      message: "If this email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    if (isTransientSupabaseNetworkError(err)) {
      return transientSupabaseResponse(res);
    }
    return res.status(500).json({ error: "Server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token_hash, new_password } = req.body;

    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash,
      });

    if (verifyError || !verifyData?.user?.id) {
      return res.status(400).json({
        error: verifyError?.message || "Invalid or expired reset token",
      });
    }

    const userId = verifyData.user.id;
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: new_password,
      });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ message: "Password has been reset" });
  } catch (err) {
    console.error("resetPassword error:", err);
    if (isTransientSupabaseNetworkError(err)) {
      return transientSupabaseResponse(res);
    }
    return res.status(500).json({ error: "Server error" });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { current_password, new_password } = req.body;

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user?.email) {
      return res.status(400).json({ error: "Unable to resolve account" });
    }

    const email = userData.user.email;
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: current_password,
    });

    if (verifyError) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: new_password,
      });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    if (isTransientSupabaseNetworkError(err)) {
      return transientSupabaseResponse(res);
    }
    return res.status(500).json({ error: "Server error" });
  }
};
