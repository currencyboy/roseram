import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';
import { getDeploymentStatus, isFlyIOConfigured } from '@/lib/flyio-deployment';

/**
 * Status Check Endpoint - No authentication required
 *
 * Called by QuickPreview component for real-time polling
 * GET /api/instant-preview/status?appName=preview-xxx&projectId=yyy
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appName = searchParams.get('appName');
    const projectId = searchParams.get('projectId');

    if (!appName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing appName parameter',
          required: ['appName']
        },
        { status: 400 }
      );
    }

    logger.info('Instant preview status check', { appName, projectId });

    // Try to get real-time machine status from Fly.io
    if (isFlyIOConfigured()) {
      try {
        const status = await getDeploymentStatus(appName);

        logger.info('Machine status retrieved from Fly.io', {
          appName,
          machineState: status.machineState,
          deployed: status.deployed,
        });

        return NextResponse.json({
          success: true,
          appName,
          machineState: status.machineState || 'unknown',
          deployed: status.deployed,
          appStatus: status.appStatus,
          errorMessage: status.errorMessage,
          source: 'flyio',
        });
      } catch (flyErr) {
        logger.warn('Could not get machine status from Fly.io, trying database', {
          appName,
          error: flyErr.message,
        });

        // Fall back to database status
        try {
          const { data: app, error: dbSelectError } = await supabaseServer
            .from('fly_preview_apps')
            .select('status, error_message, preview_url')
            .eq('fly_app_name', appName)
            .maybeSingle();

          if (dbSelectError) {
            logger.warn('Database query error', {
              appName,
              error: dbSelectError.message,
            });
          }

          if (app) {
            logger.info('Machine status retrieved from database', {
              appName,
              dbStatus: app.status,
            });

            return NextResponse.json({
              success: true,
              appName,
              machineState: app.status === 'running' ? 'started' : 'pending',
              dbStatus: app.status,
              errorMessage: app.error_message,
              previewUrl: app.preview_url,
              source: 'database',
            });
          }

          // App not found in database
          logger.warn('App not found in database', { appName });
          return NextResponse.json({
            success: true,
            appName,
            machineState: 'pending',
            source: 'unknown',
            message: 'App is initializing (not yet in database)',
          });
        } catch (dbErr) {
          logger.warn('Could not get app from database', {
            appName,
            error: dbErr.message,
          });

          return NextResponse.json({
            success: true,
            appName,
            machineState: 'pending',
            source: 'error',
            message: `Checking status: ${dbErr.message}`,
          });
        }
      }
    }

    // Last resort - check database
    try {
      const { data: app } = await supabaseServer
        .from('fly_preview_apps')
        .select('status, error_message, preview_url')
        .eq('fly_app_name', appName)
        .maybeSingle();

      if (app) {
        return NextResponse.json({
          success: true,
          appName,
          machineState: app.status === 'running' ? 'started' : 'pending',
          dbStatus: app.status,
          errorMessage: app.error_message,
          previewUrl: app.preview_url,
          source: 'database',
        });
      }
    } catch (err) {
      logger.warn('Database lookup failed', { appName, error: err.message });
    }

    return NextResponse.json({
      success: false,
      appName,
      machineState: 'unknown',
      message: 'Unable to determine machine status',
    }, { status: 404 });
  } catch (error) {
    logger.error('Status check failed', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to check preview status', message: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
