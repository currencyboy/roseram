import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON;

  const netlifyAccessToken = process.env.NEXT_NETLIFY_ACCESS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;
  const netlifySiteId = process.env.NEXT_NETLIFY_SITE_ID || process.env.NETLIFY_SITE_ID;

  const integrations = {
    supabase: {
      configured: !!(supabaseUrl && supabaseAnonKey),
      url: supabaseUrl ? "✓" : "✗",
      anonKey: supabaseAnonKey ? "✓" : "✗",
    },
    xapi: {
      configured: !!process.env.X_API_KEY,
      apiKey: process.env.X_API_KEY ? "✓" : "✗",
    },
    github: {
      configured: !!process.env.GITHUB_ACCESS_TOKEN,
      token: process.env.GITHUB_ACCESS_TOKEN ? "✓" : "✗",
    },
    netlify: {
      configured: !!(
        netlifyAccessToken &&
        netlifySiteId
      ),
      token: netlifyAccessToken ? "✓" : "✗",
      siteId: netlifySiteId ? "✓" : "✗",
    },
  };

  const allConfigured = Object.values(integrations).every(
    (integration) => integration.configured
  );

  return NextResponse.json({
    status: allConfigured ? "ready" : "incomplete",
    integrations,
    timestamp: new Date().toISOString(),
  });
}
