import { NextResponse } from "next/server";

export async function GET() {
  const clientId = "your-github-client-id";
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/github/callback`;
  const scope = "repo,user";
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  
  return NextResponse.redirect(authUrl);
}
