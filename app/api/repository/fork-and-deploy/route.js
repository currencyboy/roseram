import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger, ValidationError, ExternalServiceError, AuthenticationError } from '@/lib/errors';
import repositoryOrchestrator from '@/lib/repository-orchestrator';

/**
 * Extract and validate user from Bearer token
 */
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

/**
 * Get GitHub token from user's stored credentials or fallback to request
 */
async function getGitHubToken(user, requestToken = null) {
  // Use provided token first
  if (requestToken) {
    return requestToken;
  }

  // Try to get stored GitHub token from user_env_vars
  try {
    const { data } = await supabaseServer
      .from('user_env_vars')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('provider', 'github')
      .single();

    if (data?.metadata?.token) {
      logger.info('[ForkAndDeploy] Using stored GitHub token from user_env_vars', {
        userId: user.id,
      });
      return data?.metadata?.token;
    }
  } catch (err) {
    logger.debug('[ForkAndDeploy] No stored GitHub token in user_env_vars', {
      userId: user.id,
      error: err.message,
    });
  }

  // Fall back to environment variable
  const envToken = process.env.GITHUB_ACCESS_TOKEN;
  if (envToken) {
    logger.debug('[ForkAndDeploy] Using GitHub token from environment variable');
    return envToken;
  }

  return null;
}

/**
 * Store GitHub token in user_env_vars for future use
 */
async function storeGitHubToken(userId, token) {
  try {
    // Check if entry already exists
    const { data: existing } = await supabaseServer
      .from('user_env_vars')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'github')
      .single();

    if (existing) {
      // Update existing entry
      await supabaseServer
        .from('user_env_vars')
        .update({ metadata: { token } })
        .eq('id', existing.id);
      logger.info('[ForkAndDeploy] Updated stored GitHub token', { userId });
    } else {
      // Create new entry
      await supabaseServer
        .from('user_env_vars')
        .insert({
          user_id: userId,
          provider: 'github',
          metadata: { token },
        });
      logger.info('[ForkAndDeploy] Stored GitHub token for user', { userId });
    }
  } catch (err) {
    logger.warn('[ForkAndDeploy] Failed to store GitHub token', {
      userId,
      error: err.message,
    });
    // Don't throw - deployment succeeded, just couldn't save token
  }
}

/**
 * POST /api/repository/fork-and-deploy
 * 
 * Orchestrates complete workflow:
 * 1. Fork repository
 * 2. Deploy to Fly.io
 * 3. Poll status until running
 * 
 * Request body:
 * {
 *   gitHubToken: string,           // User's GitHub PAT
 *   sourceOwner: string,           // Original repo owner
 *   sourceRepo: string,            // Original repo name
 *   branch?: string,               // Branch to deploy (default: main)
 *   region?: string,               // Fly.io region (default: cdg)
 *   projectId?: string,            // Project ID to associate (optional)
 *   progressCallback?: function    // For real-time progress updates
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   fork: {
 *     url: string,
 *     cloneUrl: string,
 *     owner: string,
 *     repo: string,
 *     branch: string,
 *     isNewFork: boolean
 *   },
 *   deployment: {
 *     appName: string,
 *     previewUrl: string,
 *     region: string,
 *     status: string,
 *     deploymentId: string
 *   }
 * }
 */
export async function POST(request) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);

    // Parse request body
    const body = await request.json();
    const {
      gitHubToken: providedToken,
      sourceOwner,
      sourceRepo,
      branch = 'main',
      region = 'cdg',
      projectId,
      storeToken = false,
    } = body;

    // Validate required parameters
    if (!sourceOwner || !sourceRepo) {
      return NextResponse.json(
        { error: 'Missing required parameters: sourceOwner and sourceRepo' },
        { status: 400 }
      );
    }

    // Get GitHub token (from request or stored)
    const gitHubToken = await getGitHubToken(user, providedToken);

    if (!gitHubToken) {
      return NextResponse.json(
        {
          error: 'GitHub token required',
          message: 'Please provide gitHubToken or connect GitHub in your integrations',
        },
        { status: 401 }
      );
    }

    logger.info('[ForkAndDeploy API] Request received', {
      userId: user.id,
      sourceOwner,
      sourceRepo,
      branch,
      region,
      projectId,
    });

    // Execute orchestration
    const result = await repositoryOrchestrator.orchestrateForkAndDeploy(
      user.id,
      gitHubToken,
      sourceOwner,
      sourceRepo,
      {
        branch,
        region,
        progressCallback: (progress) => {
          logger.debug('[ForkAndDeploy Progress]', progress);
          // Progress is logged but not sent in response
          // For real-time updates, use WebSocket or Server-Sent Events
        },
      }
    );

    logger.info('[ForkAndDeploy API] Workflow completed successfully', {
      workflowId: result.workflowId,
      appName: result.deployment.appName,
      previewUrl: result.deployment.previewUrl,
    });

    // Store GitHub token if requested
    if (storeToken && providedToken) {
      await storeGitHubToken(user.id, providedToken);
    }

    // Optionally store deployment record in database
    if (projectId && supabaseServer) {
      try {
        await supabaseServer
          .from('fly_preview_apps')
          .insert({
            user_id: user.id,
            project_id: projectId,
            fork_url: result.fork.url,
            fork_owner: result.fork.owner,
            fork_repo: result.fork.repo,
            fork_branch: result.fork.branch,
            fly_app_name: result.deployment.appName,
            preview_url: result.deployment.previewUrl,
            region: result.deployment.region,
            status: 'running',
            source_owner: sourceOwner,
            source_repo: sourceRepo,
          });
      } catch (dbErr) {
        logger.warn('[ForkAndDeploy API] Failed to store deployment record', {
          error: dbErr.message,
        });
        // Don't fail the request if DB insert fails
      }
    }

    return NextResponse.json({
      success: true,
      workflowId: result.workflowId,
      fork: result.fork,
      deployment: result.deployment,
      tokenStored: storeToken && providedToken ? true : false,
    });
  } catch (error) {
    logger.error('[ForkAndDeploy API] Error', { error: error.message });

    let statusCode = 500;
    let message = error.message;

    if (error instanceof AuthenticationError) {
      statusCode = 401;
    } else if (error instanceof ValidationError) {
      statusCode = 400;
    } else if (error instanceof ExternalServiceError) {
      statusCode = error.statusCode || 502;
      message = `${error.service}: ${error.message}`;
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        details: error.details || {},
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/repository/fork-and-deploy?workflowId=xxx
 * 
 * Get status of a specific workflow
 */
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Missing required parameter: workflowId' },
        { status: 400 }
      );
    }

    const status = repositoryOrchestrator.getWorkflowStatus(workflowId);

    if (!status) {
      return NextResponse.json(
        { error: 'Workflow not found or already completed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workflowId,
      status,
    });
  } catch (error) {
    logger.error('[ForkAndDeploy GET] Error', { error: error.message });

    let statusCode = 500;
    if (error instanceof AuthenticationError) {
      statusCode = 401;
    }

    return NextResponse.json(
      {
        error: error.message,
      },
      { status: statusCode }
    );
  }
}
