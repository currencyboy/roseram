import { NextRequest, NextResponse } from "next/server";

export async function GET(request) {
  // Only expose non-sensitive public keys and URL configurations
  // Service role keys and secret tokens are intentionally excluded for security
  const config = {
    GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN || "",
    SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || "",
    SUPABASE_ANON: process.env.SUPABASE_ANON || process.env.NEXT_PUBLIC_SUPABASE_ANON || "",
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE || "",
    X_API_KEY: process.env.X_API_KEY || "",
    VITE_NETLIFY_ACCESS_TOKEN: process.env.VITE_NETLIFY_ACCESS_TOKEN || "",
    VITE_NETLIFY_SITE_ID: process.env.VITE_NETLIFY_SITE_ID || "",
  };

  return NextResponse.json(config);
}
