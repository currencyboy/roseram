import { NextRequest, NextResponse } from "next/server";
import { logger, AuthenticationError, ValidationError } from "@/lib/errors";
import { supabaseServer } from "@/lib/supabase";

const GITHUB_API = 'https://api.github.com';
const NETLIFY_API = 'https://api.netlify.com/api/v1';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError("Missing authorization token");
  }

  const token = authHeader.slice(7);
  const response = await supabaseServer?.auth.getUser(token);

  if (!response) {
    throw new AuthenticationError("Invalid token");
  }

  const { data, error } = response;

  if (error || !data?.user) {
    throw new AuthenticationError("Invalid token");
  }

  return data.user;
}

async function encryptToken(token) {
  return Buffer.from(token).toString('base64');
}

async function verifyGithubToken(token) {
  try {
    const response = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return { valid: true, username: data.login };
  } catch {
    return { valid: false };
  }
}

async function verifyNetlifyToken(token) {
  try {
    const response = await fetch(`${NETLIFY_API}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return { valid: true, userId: data.id };
  } catch {
    return { valid: false };
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { provider, token } = body;

    if (!provider || !['github', 'netlify'].includes(provider)) {
      throw new ValidationError("Invalid provider");
    }

    if (!token || token.trim().length === 0) {
      throw new ValidationError("Token is required");
    }

    logger.info("Verifying integration token", { provider, userId: user.id });

    let verification;
    if (provider === 'github') {
      verification = await verifyGithubToken(token);
    } else {
      verification = await verifyNetlifyToken(token);
    }

    if (!verification.valid) {
      throw new ValidationError(`Invalid ${provider} token`);
    }

    const identifier =
      'username' in verification && verification.username
        ? verification.username
        : 'userId' in verification && verification.userId
          ? verification.userId
          : '';

    if (!identifier) {
      throw new ValidationError(`Verification result missing identifier for ${provider}`);
    }

    const encryptedToken = await encryptToken(token);

    if (!supabaseServer) {
      throw new Error("Database not configured");
    }

    const { data, error } = await supabaseServer
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider,
        token_encrypted: encryptedToken,
        metadata: {
          username: identifier,
          verified_at: new Date().toISOString(),
        },
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info("Integration saved successfully", { provider, userId: user.id });

    return NextResponse.json({
      success: true,
      message: `${provider} integration saved successfully`,
      data: {
        provider,
        is_active: true,
        verified: true,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    logger.error("Error saving integration", error);
    return NextResponse.json(
      { success: false, error: "Failed to save integration" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    logger.info("Fetching integrations", { userId: user.id, provider: provider || 'all' });

    if (!supabaseServer) {
      throw new Error("Database not configured");
    }

    let query = supabaseServer
      .from('user_integrations')
      .select('provider, is_active, metadata')
      .eq('user_id', user.id);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    logger.error("Error fetching integrations", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      throw new ValidationError("Provider is required");
    }

    logger.info("Disconnecting integration", { provider, userId: user.id });

    if (!supabaseServer) {
      throw new Error("Database not configured");
    }

    const { error } = await supabaseServer
      .from('user_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `${provider} integration disconnected`,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    logger.error("Error disconnecting integration", error);
    return NextResponse.json(
      { success: false, error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
