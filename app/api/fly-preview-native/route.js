import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger, ValidationError, ExternalServiceError, AuthenticationError } from '@/lib/errors';
import { flyNativePreview } from '@/lib/fly-native-preview-service';
import crypto from 'crypto';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing authorization token');
  }

  const token = authHeader.slice(7);
  if (!supabaseServer) {
    throw new ExternalServiceError(
      'Supabase',
      'Supabase not configured',
      { statusCode: 500 }
    );
  }

  const { data, error } = await supabaseServer.auth.getUser(token);

  if (error || !data?.user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  return data.user;
}

function generatePreviewAppName(userId, projectId) {
  const hash = crypto
    .createHash('md5')
    .update(`${userId}-${projectId}-${Date.now()}`)
    .digest('hex')
    .slice(0, 8);
  return `roseram-${hash}`.toLowerCase();
}

function generatePreviewUrl(appName) {
  return `https://${appName}.fly.dev`;
}

/**
 * GET /api/fly-preview-native
 * Start a new Fly.io preview or retrieve existing one
 */
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const repoParam = searchParams.get('repo');
    const branchParam = searchParams.get('branch');

    if (!repoParam || !branchParam) {
      throw new ValidationError('repo and branch query parameters are required');
    }

    const repositoryUrl = `https://github.com/${repoParam}`;
    const workingBranch = branchParam;

    // Check if Fly.io is configured
    if (!flyNativePreview.isConfigured()) {
      return NextResponse.json(
        { error: 'Fly.io is not configured. Contact administrator.' },
        { status: 503 }
      );
    }

    // Generate unique app name
    const appName = generatePreviewAppName(user.id, projectId || repoParam);
    const previewUrl = generatePreviewUrl(appName);

    // Create or update preview record in database
    const { data: previewRecord, error: upsertError } = await supabaseServer
      .from('fly_preview_apps')
      .upsert(
        {
          project_id: projectId || `preview-${Date.now()}`,
          user_id: user.id,
          fly_app_name: appName,
          github_repo_url: repositoryUrl,
          github_branch: workingBranch,
          preview_url: previewUrl,
          status: 'initializing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'fly_app_name,user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (upsertError) {
      logger.error('[FlyPreviewNative] Failed to create preview record', { error: upsertError });
      throw new ExternalServiceError('Database', 'Failed to create preview record');
    }

    // Start deployment in background
    startDeploymentBackground(appName, repositoryUrl, workingBranch, previewRecord.id, user.id);

    return NextResponse.json({
      success: true,
      preview: {
        id: previewRecord.id,
        appName,
        previewUrl,
        status: 'initializing',
        message: 'Preview is being provisioned...',
      },
    });
  } catch (error) {
    logger.error('GET /api/fly-preview-native failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof ExternalServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create preview' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fly-preview-native
 * Get preview status
 */
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { previewId, action } = body;

    if (!previewId) {
      return NextResponse.json(
        { error: 'previewId is required' },
        { status: 400 }
      );
    }

    // Get preview from database
    const { data: preview, error: queryError } = await supabaseServer
      .from('fly_preview_apps')
      .select('*')
      .eq('id', previewId)
      .eq('user_id', user.id)
      .single();

    if (queryError || !preview) {
      return NextResponse.json(
        { error: 'Preview not found or access denied' },
        { status: 404 }
      );
    }

    // Handle status action
    if (action === 'status' || !action) {
      try {
        const flyStatus = await flyNativePreview.getPreviewStatus(preview.fly_app_name);

        // Update database with latest status
        if (flyStatus.machineState === 'started') {
          await supabaseServer
            .from('fly_preview_apps')
            .update({
              status: 'running',
              updated_at: new Date().toISOString(),
            })
            .eq('id', previewId)
            .catch(err => logger.warn('Failed to update status', { err }));
        }

        return NextResponse.json({
          success: true,
          preview: {
            id: preview.id,
            appName: preview.fly_app_name,
            previewUrl: preview.preview_url,
            status: flyStatus.machineState === 'started' ? 'running' : preview.status,
            flyStatus,
          },
        });
      } catch (error) {
        logger.error('Failed to get preview status', { appName: preview.fly_app_name, error: error.message });
        
        return NextResponse.json({
          success: true,
          preview: {
            id: preview.id,
            appName: preview.fly_app_name,
            previewUrl: preview.preview_url,
            status: preview.status,
            error: 'Could not fetch Fly.io status',
          },
        });
      }
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('POST /api/fly-preview-native failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get preview status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fly-preview-native
 * Destroy preview
 */
export async function DELETE(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const previewId = searchParams.get('previewId');

    if (!previewId) {
      return NextResponse.json(
        { error: 'previewId is required' },
        { status: 400 }
      );
    }

    // Get preview
    const { data: preview, error: queryError } = await supabaseServer
      .from('fly_preview_apps')
      .select('*')
      .eq('id', previewId)
      .eq('user_id', user.id)
      .single();

    if (queryError || !preview) {
      return NextResponse.json(
        { error: 'Preview not found or access denied' },
        { status: 404 }
      );
    }

    // Destroy the Fly.io app
    try {
      await flyNativePreview.destroyPreview(preview.fly_app_name);
      logger.info('Preview destroyed', { appName: preview.fly_app_name });
    } catch (destroyError) {
      logger.warn('Could not destroy Fly.io app', {
        appName: preview.fly_app_name,
        error: destroyError.message
      });
    }

    // Update status to stopped
    const { error: updateError } = await supabaseServer
      .from('fly_preview_apps')
      .update({ status: 'stopped', updated_at: new Date().toISOString() })
      .eq('id', previewId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Preview destroyed',
      appName: preview.fly_app_name,
    });
  } catch (error) {
    logger.error('DELETE /api/fly-preview-native failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to destroy preview' },
      { status: 500 }
    );
  }
}

/**
 * Background deployment handler
 */
async function startDeploymentBackground(appName, repoUrl, branch, previewId, userId) {
  // Start deployment without blocking the response
  setTimeout(async () => {
    try {
      logger.info('[FlyPreviewNative] Starting background deployment', { appName, repoUrl, branch });

      // Deploy the preview
      await flyNativePreview.deployPreview(appName, repoUrl, branch, {
        packageManager: 'npm',
        installCmd: 'npm install',
        devCmd: 'npm run dev',
        port: 3000,
        cpus: 2,
        memory: 512,
        region: 'iad',
      });

      // Update status to deployed
      await supabaseServer
        .from('fly_preview_apps')
        .update({
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .eq('id', previewId)
        .catch(err => logger.error('Failed to update running status', { err }));

      logger.info('[FlyPreviewNative] Deployment completed', { appName });
    } catch (error) {
      logger.error('[FlyPreviewNative] Deployment failed', {
        appName,
        error: error.message,
      });

      // Update status to error
      await supabaseServer
        .from('fly_preview_apps')
        .update({
          status: 'error',
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', previewId)
        .catch(err => logger.error('Failed to update error status', { err }));
    }
  }, 100);
}
