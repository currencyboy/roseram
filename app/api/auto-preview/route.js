/**
 * Automated Preview API
 * Handles full workflow: detect package manager -> create package.json if needed ->
 * spin up Sprite -> run dev server -> expose preview URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger, ValidationError, ExternalServiceError, AuthenticationError } from '@/lib/errors';
import { Octokit } from 'octokit';
import autoPreviewManager from '@/lib/auto-preview-manager';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');

  // Authentication is optional - allow unauthenticated access
  if (!authHeader?.startsWith('Bearer ')) {
    // Generate a guest user ID for unauthenticated requests
    const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('[AutoPreview] Unauthenticated request - using guest ID', { guestId });
    return {
      id: guestId,
      email: null,
      isGuest: true,
    };
  }

  const token = authHeader.slice(7);
  if (!supabaseServer) {
    throw new ExternalServiceError('Supabase', 'Supabase not configured', { statusCode: 500 });
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) {
    // Fall back to guest user if token is invalid
    const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('[AutoPreview] Invalid token - falling back to guest ID', { guestId, error: error?.message });
    return {
      id: guestId,
      email: null,
      isGuest: true,
    };
  }

  return data.user;
}

async function getGithubAPI(user) {
  // Try to get user's GitHub token from user_env_vars first
  let token = null;
  try {
    const { data } = await supabaseServer
      .from('user_env_vars')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('provider', 'github')
      .single();
    token = data?.metadata?.token;
    if (token) {
      logger.debug('[AutoPreview] Found GitHub token in user_env_vars', { userId: user.id });
    }
  } catch (err) {
    // No integration found, will fall back to env var
    logger.debug('[AutoPreview] No GitHub token in user_env_vars', { error: err.message });
  }

  // Fall back to environment variable if user hasn't configured their own
  if (!token) {
    token = process.env.GITHUB_ACCESS_TOKEN;
    if (token) {
      logger.debug('[AutoPreview] Using GitHub token from environment variable');
    }
  }

  if (!token) {
    throw new AuthenticationError('GitHub token not configured. Please connect GitHub in integrations.');
  }

  return new Octokit({
    auth: token,
  });
}

/**
 * POST /api/auto-preview
 * Create automated preview
 * Body: {
 *   projectId: string,
 *   owner: string,
 *   repo: string,
 *   branch?: string,
 *   region?: string,
 *   ramMB?: number,
 *   cpus?: number,
 * }
 */
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();

    const {
      projectId,
      owner,
      repo,
      branch = 'main',
      region = 'ord',
      ramMB = 1024,
      cpus = 1,
    } = body;

    // Validate input
    if (!projectId || !owner || !repo) {
      throw new ValidationError('projectId, owner, and repo are required');
    }

    logger.info('[AutoPreview] Starting automated preview', {
      projectId,
      owner,
      repo,
      branch,
      userId: user.id,
    });

    // Get GitHub API with user's token
    const githubAPI = await getGithubAPI(user);

    // Check if preview already exists
    let existingPreview = null;
    try {
      const { data } = await supabaseServer
        .from('auto_preview_instances')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();
      existingPreview = data;
    } catch (err) {
      // No existing preview found, which is fine
      logger.debug('[AutoPreview] No existing preview found', { error: err.message });
    }

    if (existingPreview && existingPreview.status === 'running') {
      logger.info('[AutoPreview] Found existing running preview', { projectId });
      return NextResponse.json({
        success: true,
        preview: existingPreview,
        message: 'Using existing preview',
      });
    }

    // Create preview record
    logger.debug('[AutoPreview] Attempting to create preview record', {
      projectId,
      userId: user.id,
      owner,
      repo,
      branch
    });

    const { data: previewRecord, error: insertError } = await supabaseServer
      .from('auto_preview_instances')
      .insert({
        project_id: projectId,
        user_id: user.id,
        owner,
        repo,
        branch,
        status: 'initializing',
        preview_url: null,
        package_manager: null,
        error_message: null,
      })
      .select()
      .single();

    if (insertError || !previewRecord) {
      const errorMsg = insertError?.message || 'No record returned after insert';
      const errorCode = insertError?.code;

      logger.error('[AutoPreview] Failed to create preview record', {
        error: errorMsg,
        insertError: insertError?.message,
        insertErrorCode: errorCode,
        recordId: previewRecord?.id,
        projectId
      });

      // Check if it's a table not found error
      if (errorCode === '42P01' || errorMsg.includes('does not exist') || errorMsg.includes('auto_preview_instances')) {
        throw new ExternalServiceError('Database', 'Preview system not initialized. Please run the schema setup.', { statusCode: 500 });
      }

      throw new ExternalServiceError('Database', `Failed to create preview record: ${errorMsg}`, { statusCode: 500 });
    }

    logger.info('[AutoPreview] Created preview record', {
      recordId: previewRecord.id,
      projectId,
      userId: user.id
    });

    // Start preview provisioning in background
    startPreviewProvisioning(
      githubAPI,
      previewRecord.id,
      projectId,
      owner,
      repo,
      branch,
      region,
      ramMB,
      cpus,
      user.id
    );

    return NextResponse.json({
      success: true,
      preview: previewRecord,
      message: 'Preview provisioning started',
    });
  } catch (error) {
    logger.error('[AutoPreview] POST failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ExternalServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }

    return NextResponse.json({ error: 'Failed to create preview' }, { status: 500 });
  }
}

/**
 * GET /api/auto-preview?projectId=...
 * Get preview status
 */
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      throw new ValidationError('projectId is required');
    }

    logger.debug('[AutoPreview] Polling for preview', { projectId, userId: user.id, isGuest: user.isGuest });

    let preview;
    try {
      // For guest users or if user_id matches, fetch the preview
      // We support both user-specific and project-specific queries
      let query = supabaseServer
        .from('auto_preview_instances')
        .select('*')
        .eq('project_id', projectId);

      // If authenticated user, also filter by user_id
      if (!user.isGuest) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.single();

      if (error) {
        logger.debug('[AutoPreview] Query error', {
          error: error.message,
          projectId,
          userId: user.id,
          code: error.code
        });
        return NextResponse.json(
          { error: 'Preview not found', details: error.message },
          { status: 404 }
        );
      }

      preview = data;
    } catch (error) {
      logger.debug('[AutoPreview] Catch error in query', {
        error: error.message,
        projectId
      });
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    if (!preview) {
      logger.debug('[AutoPreview] No preview data returned', { projectId });
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    logger.debug('[AutoPreview] Found preview', {
      projectId,
      status: preview.status,
      hasUrl: !!preview.preview_url
    });

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error) {
    logger.error('[AutoPreview] GET failed', { error: error.message });

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to get preview' }, { status: 500 });
  }
}

/**
 * DELETE /api/auto-preview?projectId=...
 * Destroy preview
 */
export async function DELETE(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      throw new ValidationError('projectId is required');
    }

    let preview;
    try {
      // For guest users, allow deletion based on projectId alone
      // For authenticated users, also check user_id for security
      let query = supabaseServer
        .from('auto_preview_instances')
        .select('*')
        .eq('project_id', projectId);

      if (!user.isGuest) {
        query = query.eq('user_id', user.id);
      }

      const { data } = await query.single();
      preview = data;
    } catch (error) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    if (!preview) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    logger.info('[AutoPreview] Destroying preview', { projectId, userId: user.id, isGuest: user.isGuest });

    // Destroy sprite if it exists
    if (preview.sprite_name) {
      try {
        const spritesService = (await import('@/lib/sprites-service')).default;
        if (spritesService.isConfigured()) {
          await spritesService.destroySprite(preview.sprite_name);
        }
      } catch (err) {
        logger.warn('[AutoPreview] Could not destroy sprite', { error: err.message });
      }
    }

    // Update status
    await supabaseServer
      .from('auto_preview_instances')
      .update({ status: 'stopped', error_message: null })
      .eq('id', preview.id);

    logger.info('[AutoPreview] Preview destroyed', { projectId });

    return NextResponse.json({
      success: true,
      message: 'Preview destroyed',
    });
  } catch (error) {
    logger.error('[AutoPreview] DELETE failed', { error: error.message });

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to destroy preview' }, { status: 500 });
  }
}

/**
 * Background task: Provision automated preview
 * Includes timeout to prevent hanging
 */
async function startPreviewProvisioning(
  githubAPI,
  recordId,
  projectId,
  owner,
  repo,
  branch,
  region,
  ramMB,
  cpus,
  userId
) {
  // Start provisioning after a short delay
  setTimeout(async () => {
    let timeoutId = null;

    try {
      logger.info('[AutoPreview] Starting provisioning task', { recordId, projectId });

      // Update status
      await supabaseServer
        .from('auto_preview_instances')
        .update({ status: 'detecting_environment' })
        .eq('id', recordId);

      // Create a promise that rejects after 20 minutes (1200 seconds)
      const provisioningTimeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Provisioning timeout after 20 minutes - the dev server took too long to start'));
        }, 20 * 60 * 1000);
      });

      // Race between provisioning and timeout
      const preview = await Promise.race([
        autoPreviewManager.createPreview(
          githubAPI,
          projectId,
          owner,
          repo,
          branch,
          { region, ramMB, cpus }
        ),
        provisioningTimeout
      ]);

      // Clear timeout if provisioning completed successfully
      if (timeoutId) clearTimeout(timeoutId);

      logger.info('[AutoPreview] Preview created successfully', {
        recordId,
        previewUrl: preview.previewUrl,
        packageManager: preview.packageManager,
      });

      // Update database with success
      await supabaseServer
        .from('auto_preview_instances')
        .update({
          status: 'running',
          sprite_name: preview.spriteName,
          port: preview.port,
          preview_url: preview.previewUrl,
          package_manager: preview.packageManager,
          script_name: preview.scriptName,
          error_message: null,
        })
        .eq('id', recordId);

      logger.info('[AutoPreview] Database updated with preview info', { recordId });
    } catch (error) {
      // Clear timeout if error occurred
      if (timeoutId) clearTimeout(timeoutId);

      // Extract error message from different error formats
      let errorMessage = 'Failed to provision preview';

      if (error?.error) {
        // Error thrown from AutoPreviewManager as { error, projectId, details }
        errorMessage = error.error;
      } else if (error?.message) {
        // Standard Error object
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        // String error
        errorMessage = error;
      }

      logger.error('[AutoPreview] Provisioning failed', {
        recordId,
        projectId,
        error: errorMessage,
        errorType: typeof error,
        fullError: JSON.stringify(error),
      });

      // Update database with error
      try {
        await supabaseServer
          .from('auto_preview_instances')
          .update({
            status: 'error',
            error_message: errorMessage,
          })
          .eq('id', recordId);

        logger.info('[AutoPreview] Error status updated in database', { recordId, errorMessage });
      } catch (err) {
        logger.error('[AutoPreview] Failed to update error status', {
          recordId,
          err: err.message,
          errorMessage
        });
      }
    }
  }, 100);
}
