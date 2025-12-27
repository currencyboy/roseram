import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || process.env.SUPABASE_PROJECT_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAuth() {
  console.log("Setting up authentication...");

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables not set");
    process.exit(1);
  }

  try {
    const { data, error: getUserError } =
      await supabase.auth.admin.listUsers();

    const userExists = existingUser?.users?.some((u) => u.email === email);

    if (userExists) {
      console.log(`User ${email} already exists`);
      return;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm,
    });

    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }

    console.log("✓ Admin user created successfully");
    console.log(`Email: ${email}`);
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
}

setupAuth();
