import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger, AuthenticationError } from '@/lib/errors';
import { getMachineLogs, isFlyIOConfigured } from '@/lib/flyio-deployment';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing authorization token');
  }

  const token = authHeader.slice(7);
  if (!supabaseServer) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabaseServer.auth.getUser(token);

  if (error || !data?.user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  return data.user;
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const limit = searchParams.get('limit') || '100';

    if (!appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      );
    }

    // Check if Fly.io is configured
    if (!isFlyIOConfigured()) {
      return NextResponse.json(
        { error: 'Fly.io is not configured' },
        { status: 503 }
      );
    }

    // Get the preview app
    const { data: app, error: queryError } = await supabaseServer
      .from('fly_preview_apps')
      .select('*')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (queryError || !app) {
      return NextResponse.json(
        { error: 'App not found or not authorized' },
        { status: 404 }
      );
    }

    // Get machine logs
    // For now, we'll use the app name as machine ID (Fly.io typically has one machine per app)
    const logs = await getMachineLogs(app.fly_app_name, app.fly_app_name, parseInt(limit));

    return NextResponse.json({
      success: true,
      appName: app.fly_app_name,
      appId,
      logs: logs.logs,
      message: logs.message,
      error: logs.error,
      retrievedAt: logs.retrievedAt,
    });
  } catch (error) {
    logger.error('GET /api/fly-preview-logs failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch machine logs',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
