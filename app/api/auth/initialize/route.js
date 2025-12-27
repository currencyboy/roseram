import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { logger } from "@/lib/errors";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@roseram.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SETUP_KEY = process.env.SETUP_KEY;

export async function POST(request) {
  // Security check - only allow setup in development or with proper key
  const setupKey = request.headers.get("x-setup-key");

  if (
    process.env.NODE_ENV === "production" &&
    setupKey !== SETUP_KEY
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        error: "Admin password not configured",
        message: "Set ADMIN_PASSWORD environment variable",
      },
      { status: 500 }
    );
  }

  try {
    logger.info("Initializing admin user");

    if (!supabaseServer) {
      throw new Error("Supabase server client is not available");
    }

    const { data, error } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm,
    });

    if (error) {
      if (error.message.includes("already exists")) {
        logger.info("Admin user already exists");
        return NextResponse.json({
          success,
          message: "Admin user already exists",
          email,
          is_new,
        });
      }
      throw error;
    }

    logger.info("Admin user created successfully", { userId: data?.user?.id });

    return NextResponse.json({
      success,
      message: "Admin user created successfully",
      email,
      userId: data?.user?.id,
      is_new,
    });
  } catch (error) {
    logger.error("Failed to initialize admin user", error);
    return NextResponse.json(
      {
        error: "Setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check if admin exists
  try {
    if (!supabaseServer) {
      throw new Error("Supabase server client is not available");
    }

    const { data, error } = await supabaseServer.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    const adminExists = users?.users?.some((u) => u.email === ADMIN_EMAIL);

    return NextResponse.json({
      success,
      admin_configured: !!ADMIN_PASSWORD,
      admin_exists,
      admin_email,
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    logger.error("Failed to check admin status", error);
    return NextResponse.json(
      { error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}
