import { NextRequest, NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const token = body.token || request.headers.get("authorization")?.replace("Bearer ", "");
    const envToken = process.env.GITHUB_ACCESS_TOKEN;

    const finalToken = token || envToken;

    if (!finalToken) {
      return NextResponse.json(
        { valid, error: "No GitHub token provided" },
        { status: 400 }
      );
    }

    // Test the token by fetching the authenticated user
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${finalToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RoseramBuilder",
      },
    });

    if (!response.ok) {
      let errorMessage = "Invalid token";
      if (response.status === 401) {
        errorMessage = "Token is invalid or expired";
      } else if (response.status === 403) {
        errorMessage = "Token lacks necessary scopes";
      }

      return NextResponse.json({
        valid,
        error,
        status: response.status,
      });
    }

    const userData = await response.json();

    return NextResponse.json({
      valid,
      user: {
        login: userData.login,
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
      },
      message: `Successfully authenticated as ${userData.login}`,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { valid, error: "Failed to validate token", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
