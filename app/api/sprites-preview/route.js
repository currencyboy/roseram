import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger, ValidationError, ExternalServiceError, AuthenticationError } from '@/lib/errors';
import spritesService from '@/lib/sprites-service';
import crypto from 'crypto';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');

  // Authentication is optional - allow unauthenticated guests to use preview
  if (!authHeader?.startsWith('Bearer ')) {
    // Generate a guest user ID for unauthenticated requests
    const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('[SpritesPreview] Unauthenticated request - using guest ID', { guestId });
    return {
      id: guestId,
      email: null,
      isGuest: true,
    };
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

  logger.info('[SpritesPreview] User auth check', {
    hasError: !!error,
    errorMessage: error?.message,
    hasUser: !!data?.user,
    userId: data?.user?.id,
    userEmail: data?.user?.email,
  });

  if (error || !data?.user) {
    // Fall back to guest user if token is invalid
    const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('[SpritesPreview] Invalid token - falling back to guest ID', { guestId, error: error?.message });
    return {
      id: guestId,
      email: null,
      isGuest: true,
    };
  }

  if (!data.user.id) {
    throw new AuthenticationError('User ID is missing from token');
  }

  return data.user;
}

function generateSpriteName(userId, projectId) {
  // Sprites requires names <= 63 characters
  // Format: preview-{hash} (8 chars max)
  const hash = crypto
    .createHash('md5')
    .update(`${userId}-${projectId}`)
    .digest('hex')
    .slice(0, 8);
  const name = `preview-${hash}`;

  // Validate length (max 63 characters for Sprites)
  if (name.length > 63) {
    logger.warn('[SpritesPreview] Sprite name exceeds 63 chars, truncating', {
      original: name,
      length: name.length
    });
    return name.slice(0, 60);
  }

  return name;
}

/**
 * GET /api/sprites-preview
 * Initialize or retrieve preview sprite
 */
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    let projectId = searchParams.get('projectId');
    const repoParam = searchParams.get('repo'); // Format: owner/repo
    const branchParam = searchParams.get('branch');

    if (!projectId && repoParam && branchParam) {
      projectId = `preview-${user.id}-${Date.now()}`;
      logger.info('[SpritesPreview] Using repo/branch directly', { repo: repoParam, branch: branchParam, projectId });
    } else if (!projectId) {
      projectId = `preview-${user.id}-${Date.now()}`;
    }

    // Check if Supabase server client is properly initialized
    if (!supabaseServer) {
      logger.error('[SpritesPreview] Supabase server client is null', {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
      });
      throw new ExternalServiceError(
        'Supabase',
        'Supabase server client not initialized. Check that SUPABASE_SERVICE_ROLE environment variable is set.',
        { statusCode: 500 }
      );
    }

    // Verify authenticated users exist in Supabase auth
    // Skip this check for guest users
    if (!user.isGuest) {
      logger.info('[SpritesPreview] Verifying user exists', { userId: user.id });
      const { data: authUser, error: authError } = await supabaseServer.auth.admin.getUserById(user.id);
      if (authError || !authUser?.user) {
        logger.error('[SpritesPreview] User not found in auth.users', {
          userId: user.id,
          authError: authError?.message,
        });
        throw new ExternalServiceError(
          'Database',
          `User ${user.id} not found in Supabase auth. Make sure the user is registered.`,
          { statusCode: 401 }
        );
      }
      logger.info('[SpritesPreview] User verified in auth', { userId: user.id, email: authUser.user.email });
    } else {
      logger.info('[SpritesPreview] Guest user - skipping auth verification', { userId: user.id });
    }

    // Check if preview sprite record exists
    let query = supabaseServer
      .from('auto_preview_instances')
      .select('*')
      .eq('project_id', projectId);

    // For authenticated users, also filter by user_id
    if (!user.isGuest) {
      query = query.eq('user_id', user.id);
    }

    const { data: existingSprite, error: queryError } = await query.single();

    // If sprite exists and is running, return it
    if (existingSprite && !queryError) {
      logger.info('[SpritesPreview] Found existing sprite', { spriteName: existingSprite.sprite_name, status: existingSprite.status });
      return NextResponse.json({
        success: true,
        sprite: {
          id: existingSprite.id,
          projectId: existingSprite.project_id,
          spriteName: existingSprite.sprite_name,
          previewUrl: existingSprite.preview_url,
          port: existingSprite.port,
          status: existingSprite.status,
          errorMessage: existingSprite.error_message,
        },
      });
    }

    // Check if Sprites is configured
    if (!spritesService.isConfigured()) {
      return NextResponse.json(
        { error: 'Sprites is not configured. Preview deployment is not available.' },
        { status: 503 }
      );
    }

    // Get project details
    let project = null;
    try {
      const { data } = await supabaseServer
        .from('projects')
        .select('id, repository_url, repository_name, working_branch, name, github_url, github_branch')
        .eq('id', projectId)
        .single();
      project = data;
    } catch (err) {
      project = null;
    }

    let repositoryUrl = project?.repository_url || project?.github_url;
    let workingBranch = project?.working_branch || project?.github_branch || 'main';
    const projectName = project?.name || `Preview-${projectId.slice(0, 8)}`;

    // Override with query params if provided
    if (repoParam) {
      repositoryUrl = `https://github.com/${repoParam}`;
    }
    if (branchParam) {
      workingBranch = branchParam;
    }

    if (!repositoryUrl) {
      throw new ValidationError('Project does not have a GitHub repository configured');
    }

    // Generate sprite name
    const spriteName = generateSpriteName(user.id, projectId);
    logger.info('[SpritesPreview] Creating sprite', { spriteName, repo: repositoryUrl, branch: workingBranch });

    // Extract owner and repo from GitHub URL
    // Expected format: https://github.com/owner/repo
    let owner = '';
    let repo = '';
    try {
      const urlParts = repositoryUrl.replace(/\.git$/, '').split('/');
      owner = urlParts[urlParts.length - 2] || '';
      repo = urlParts[urlParts.length - 1] || '';
    } catch (err) {
      logger.warn('[SpritesPreview] Failed to parse repo from URL', { repositoryUrl });
    }

    // Create sprite record first (before actually creating it)
    const insertPayload = {
      project_id: projectId,
      user_id: user.id,
      owner,
      repo,
      branch: workingBranch,
      sprite_name: spriteName,
      github_branch: workingBranch,
      status: 'provisioning',
      preview_url: null,
      port: null,
      error_message: null,
    };

    logger.info('[SpritesPreview] Inserting sprite record', {
      payload: insertPayload,
      statusValue: insertPayload.status,
      statusType: typeof insertPayload.status,
    });

    const { data: newSprite, error: insertError } = await supabaseServer
      .from('auto_preview_instances')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      logger.error('[SpritesPreview] Failed to create sprite record', {
        error: insertError,
        errorMessage: insertError?.message,
        errorCode: insertError?.code,
        errorDetails: insertError?.details,
        hint: insertError?.hint,
        context: insertError?.context,
        insertPayload: insertPayload,
        userId: user.id,
        userIdType: typeof user.id,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL?.substring(0, 50) + '...',
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
      });

      // More detailed error message
      const detailMsg = insertError?.details || insertError?.message || 'Unknown error';
      throw new ExternalServiceError(
        'Database',
        `Failed to create sprite: ${detailMsg}`,
        { statusCode: 500 }
      );
    }

    // Start sprite provisioning in background
    startSpriteProvisioning(
      spriteName,
      repositoryUrl,
      workingBranch,
      newSprite.id,
      user.id
    );

    return NextResponse.json({
      success: true,
      sprite: {
        id: newSprite.id,
        projectId: newSprite.project_id,
        spriteName: newSprite.sprite_name,
        previewUrl: newSprite.preview_url,
        port: newSprite.port,
        status: newSprite.status,
        errorMessage: newSprite.error_message,
      },
    });
  } catch (error) {
    logger.error('GET /api/sprites-preview failed', { error: error.message });

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
      { error: 'Failed to provision sprite' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sprites-preview
 * Get sprite status or update
 */
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { spriteId, action } = body;

    if (!spriteId) {
      return NextResponse.json(
        { error: 'spriteId is required' },
        { status: 400 }
      );
    }

    // For guest users, allow querying sprite by ID alone
    // For authenticated users, also verify user_id for security
    let query = supabaseServer
      .from('auto_preview_instances')
      .select('*')
      .eq('id', spriteId);

    if (!user.isGuest) {
      query = query.eq('user_id', user.id);
    }

    const { data: sprite, error: queryError } = await query.single();

    if (queryError || !sprite) {
      return NextResponse.json(
        { error: 'Sprite not found or not authorized' },
        { status: 404 }
      );
    }

    // Handle status check
    if (action === 'status' || !action) {
      return NextResponse.json({
        success: true,
        sprite: {
          id: sprite.id,
          projectId: sprite.project_id,
          spriteName: sprite.sprite_name,
          previewUrl: sprite.preview_url,
          port: sprite.port,
          status: sprite.status,
          errorMessage: sprite.error_message,
        },
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('POST /api/sprites-preview failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get sprite status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sprites-preview
 * Destroy sprite
 */
export async function DELETE(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const spriteId = searchParams.get('spriteId');

    if (!spriteId) {
      return NextResponse.json(
        { error: 'spriteId is required' },
        { status: 400 }
      );
    }

    // For guest users, allow deletion by ID alone
    // For authenticated users, also verify user_id for security
    let query = supabaseServer
      .from('auto_preview_instances')
      .select('*')
      .eq('id', spriteId);

    if (!user.isGuest) {
      query = query.eq('user_id', user.id);
    }

    const { data: sprite, error: queryError } = await query.single();

    if (queryError || !sprite) {
      return NextResponse.json(
        { error: 'Sprite not found or not authorized' },
        { status: 404 }
      );
    }

    // Destroy the sprite
    try {
      if (spritesService.isConfigured() && sprite.sprite_name) {
        await spritesService.destroySprite(sprite.sprite_name);
        logger.info('[SpritesPreview] Destroyed sprite', { spriteName: sprite.sprite_name });
      }
    } catch (destroyError) {
      logger.warn('[SpritesPreview] Could not destroy sprite', {
        spriteName: sprite.sprite_name,
        error: destroyError.message,
      });
    }

    // Update status to stopped
    const { error: deleteError } = await supabaseServer
      .from('auto_preview_instances')
      .update({ status: 'stopped' })
      .eq('id', spriteId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Sprite destroyed',
      spriteName: sprite.sprite_name,
    });
  } catch (error) {
    logger.error('DELETE /api/sprites-preview failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to destroy sprite' },
      { status: 500 }
    );
  }
}

/**
 * Background task: Provision and start sprite with retry logic
 */
function startSpriteProvisioning(spriteName, repoUrl, branch, spriteId, userId) {
  setTimeout(async () => {
    let retryCount = 0;
    const maxRetries = 2;
    let lastError = null;

    while (retryCount <= maxRetries) {
      try {
        logger.info('[SpritesPreview] Starting sprite provisioning', {
          spriteName,
          repoUrl,
          branch,
          attempt: retryCount + 1
        });

        // Create sprite
        const sprite = await spritesService.createSprite(spriteName, {
          ramMB: 1024, // 1GB for development
          cpus: 2,
          region: 'ord',
        });

        logger.info('[SpritesPreview] Sprite created, setting up dev server', { spriteName });

        // Setup and run dev server, wait for port to open
        const { port, pid } = await spritesService.setupAndRunDevServer(
          sprite,
          repoUrl,
          branch,
          {
            workDir: '/workspace',
            scriptName: 'dev',
            timeout: 300000, // 5 minutes
          }
        );

        // Construct preview URL - Sprites.dev automatically routes to the running port
        // Do NOT include port number in the URL
        const previewUrl = `https://${spriteName}.sprites.dev`;

        logger.info('[SpritesPreview] Dev server running', { spriteName, port, pid, previewUrl });

        // Update database with success
        await supabaseServer
          .from('auto_preview_instances')
          .update({
            status: 'running',
            port,
            preview_url: previewUrl,
            error_message: null,
          })
          .eq('id', spriteId)
          .catch((err) => logger.error('[SpritesPreview] Failed to update status', { err }));

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        logger.error('[SpritesPreview] Provisioning attempt failed', {
          spriteName,
          error: error.message,
          attempt: retryCount + 1,
          maxRetries,
        });

        // Check if error is retryable
        const isRetryable = error.message?.includes('WebSocket') ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('ECONNREFUSED') ||
                           error.message?.includes('ENOTFOUND');

        if (isRetryable && retryCount < maxRetries) {
          retryCount++;
          const delayMs = 2000 * retryCount; // Exponential backoff: 2s, 4s
          logger.info('[SpritesPreview] Retrying provisioning', {
            spriteName,
            delayMs,
            retriesLeft: maxRetries - retryCount
          });

          // Update status to show retry attempt
          await supabaseServer
            .from('auto_preview_instances')
            .update({
              status: 'detecting_environment',
              error_message: `Retrying provisioning (attempt ${retryCount + 1}/${maxRetries + 1})...`,
            })
            .eq('id', spriteId)
            .catch((err) => logger.error('[SpritesPreview] Failed to update retry status', { err }));

          await new Promise(r => setTimeout(r, delayMs));
          continue; // Retry
        } else {
          break; // Give up
        }
      }
    }

    // All retries exhausted - update database with final error
    if (lastError) {
      logger.error('[SpritesPreview] Provisioning failed after all retries', {
        spriteName,
        error: lastError.message,
        attempts: retryCount + 1,
      });

      await supabaseServer
        .from('auto_preview_instances')
        .update({
          status: 'error',
          error_message: lastError.message || 'Failed to provision sprite',
        })
        .eq('id', spriteId)
        .catch((err) => logger.error('[SpritesPreview] Failed to update error status', { err }));
    }
  }, 100);
}
