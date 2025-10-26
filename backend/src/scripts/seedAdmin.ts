import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(url, serviceKey);

const run = async () => {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@bellytalk.local";
  const password = process.env.SEED_ADMIN_PASS || "AdminPass123!";

  console.log("Creating admin user:", email);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) {
    console.error("createUser error:", error);
    process.exit(1);
  }

  const userId = data.user?.id;
  if (!userId) {
    console.error("No user id returned");
    process.exit(1);
  }

  // Upsert profile row with admin role
  const { error: insertErr } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Admin",
    role: "admin",
    role_status: "approved"
  });

  if (insertErr) {
    console.error("Failed to upsert profile:", insertErr);
    process.exit(1);
  }

  console.log("Admin created successfully:", email, "id:", userId);
  process.exit(0);
};

run();
