import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || process.env.SUPABASE_PROJECT_URL);
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        error: "Missing Supabase environment variables. " +
          "Check that NEXT_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_PROJECT_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE) are set."
      },
      { status: 500 }
    );
  }
  const setupKey = request.headers.get("x-setup-key");

  if (setupKey !== process.env.SETUP_KEY && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Admin credentials not configured in environment" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json({
          success: true,
          message: "User already exists",
          email: adminEmail,
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      email: adminEmail,
      userId: data?.user?.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Setup failed", details: String(error) },
      { status: 500 }
    );
  }
}
