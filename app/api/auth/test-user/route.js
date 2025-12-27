import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { logger } from "@/lib/errors";

/**
 * Development endpoint to create/get test user
 * Only works in development or with proper auth
 */
export async function POST(request) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  if (!supabaseServer) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    const TEST_EMAIL = "test@example.com";
    const TEST_PASSWORD = "Test@12345";

    logger.info("[TestUser] Creating or fetching test user", { email: TEST_EMAIL });

    // First, try to sign in to see if user already exists and works
    const { data: existingSignIn, error: existingSignInError } = await supabaseServer.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (existingSignIn?.session) {
      // User exists and credentials work
      logger.info("[TestUser] Test user already exists and credentials work", { userId: existingSignIn.user.id });

      return NextResponse.json({
        success: true,
        message: "Test user already exists",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        userId: existingSignIn.user.id,
        isNewUser: false,
      });
    }

    // Try to create the user if sign-in failed
    const { data: createData, error: createError } = await supabaseServer.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true, // Auto-confirm email
    });

    let userId;
    let isNewUser = false;

    if (createError) {
      if (createError.message?.includes("already exists")) {
        logger.info("[TestUser] User exists but sign-in failed, trying to recover...");

        // User exists but password might have changed or there's an issue
        // Try to delete and recreate
        try {
          const { data: existingUser } = await supabaseServer.auth.admin.getUserById(
            // We need to get the user first, but we don't know the ID
            // Instead, try to update the user's password
          );
        } catch (e) {
          logger.warn("[TestUser] Could not manage existing user", { error: e.message });
        }

        // User exists and we couldn't sign in - this is a problem state
        // Return error but suggest they might need password reset
        return NextResponse.json(
          {
            error: "Test user exists but authentication failed",
            suggestion: "Try clearing browser storage and refreshing",
            details: createError.message
          },
          { status: 500 }
        );
      }

      // Different error - something went wrong
      logger.error("[TestUser] Failed to create user", { error: createError.message });
      throw createError;
    }

    // User was successfully created
    userId = createData?.user?.id;
    isNewUser = true;
    logger.info("[TestUser] Test user created successfully", { userId });

    // Verify the user can sign in
    const { data: verifySignIn, error: verifyError } = await supabaseServer.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (verifyError) {
      logger.error("[TestUser] Created user but cannot sign in", {
        error: verifyError.message,
        userId
      });
      return NextResponse.json(
        {
          error: "Test user created but cannot authenticate",
          details: verifyError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test user created successfully",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      userId,
      isNewUser,
    });
  } catch (error) {
    logger.error("[TestUser] Failed to setup test user", { error: error.message });
    return NextResponse.json(
      {
        error: "Failed to setup test user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: "Test user endpoint available",
    usage: "POST to create/get test user",
    note: "Only available in development mode",
  });
}
