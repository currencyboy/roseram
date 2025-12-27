import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger, ValidationError, ExternalServiceError, AuthenticationError } from '@/lib/errors';
import { deployToFlyIO, getDeploymentStatus, isFlyIOConfigured, destroyDeployment } from '@/lib/flyio-deployment';
import { detectProjectType } from '@/lib/project-detector';
import { createDefaultContract, validateContract } from '@/lib/preview-contract';
import { Octokit } from 'octokit';
import crypto from 'crypto';

const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN || process.env.GITHUB_ACCESS_TOKEN;

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
    .update(`${userId}-${projectId}`)
    .digest('hex')
    .slice(0, 8);
  return `roseram-${hash}`;
}

function generatePreviewUrl(appName) {
  return `https://${appName}.fly.dev`;
}

async function triggerDeploymentBackground(projectId, appName, githubUrl, branch, previewAppId, userId) {
  // Start background deployment without waiting
  setTimeout(async () => {
    try {
      logger.info('Starting Fly.io deployment', { appName, projectId, githubUrl, branch });

      // Parse GitHub URL for project type detection
      const urlParts = githubUrl.replace(/\.git$/, '').split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];

      if (!owner || !repo) {
        throw new Error('Invalid GitHub repository URL');
      }

      // Step 1: Detect project type
      let projectType = { type: 'node' }; // Default fallback
      try {
        projectType = await detectProjectType(owner, repo, branch, GITHUB_TOKEN);
        logger.info('Project type detected', { appName, projectType });
      } catch (detectError) {
        logger.warn('Could not detect project type, using default', { error: detectError.message });
      }

      // Step 2: Try to load preview contract from repository, or create default
      let contract = null;
      if (GITHUB_TOKEN) {
        try {
          const octokit = new Octokit({ auth: GITHUB_TOKEN });
          const contractResponse = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: '.roseram/preview.json',
            ref: branch,
          });
          const contractContent = Buffer.from(contractResponse.data.content, 'base64').toString('utf-8');
          contract = JSON.parse(contractContent);
          validateContract(contract);
          logger.info('Preview contract found in repository', { appName, contract });
        } catch (contractError) {
          if (contractError.status === 404) {
            logger.info('No preview contract found, creating default', { appName, type: projectType.type });
            contract = createDefaultContract(projectType.type);
          } else {
            logger.warn('Error loading preview contract', { error: contractError.message });
            contract = createDefaultContract(projectType.type);
          }
        }
      } else {
        logger.warn('GitHub token not configured, using default contract');
        contract = createDefaultContract(projectType.type);
      }

      // Trigger actual deployment to Fly.io with the contract
      const deployResult = await deployToFlyIO(appName, githubUrl, branch, contract, {
        GITHUB_REPO: githubUrl,
        BRANCH: branch,
        PROJECT_ID: projectId,
        NODE_ENV: 'production',
      });

      // Update status to deployed
      await supabaseServer
        .from('fly_preview_apps')
        .update({
          status: 'deployed',
          fly_app_id: appName,
          error_message: null,
        })
        .eq('id', previewAppId)
        .catch(err => logger.error('Failed to update deployed status', { err }));

      logger.info('Fly.io app deployed successfully', { appName, previewUrl: deployResult.previewUrl });

      // Poll for actual machine readiness (machines might take a few seconds to start)
      let pollAttempts = 0;
      const maxPollAttempts = 60; // 5 minutes with 5 second intervals

      const pollInterval = setInterval(async () => {
        pollAttempts++;

        try {
          const status = await getDeploymentStatus(appName);

          // Check if machine is running
          if (status.machineState === 'started' || (status.deployed && status.appStatus !== 'pending')) {
            clearInterval(pollInterval);

            await supabaseServer
              .from('fly_preview_apps')
              .update({
                status: 'running',
                error_message: null,
              })
              .eq('id', previewAppId)
              .catch(err => logger.error('Failed to update running status', { err }));

            logger.info('Fly.io machine is running', { appName });
          }
        } catch (pollError) {
          logger.error('Error polling machine status', { appName, error: pollError.message });
        }

        // Stop polling after max attempts
        if (pollAttempts >= maxPollAttempts) {
          clearInterval(pollInterval);

          // Mark as running - assume machine will be ready soon
          await supabaseServer
            .from('fly_preview_apps')
            .update({
              status: 'running',
              error_message: null,
            })
            .eq('id', previewAppId)
            .catch(err => logger.error('Failed to finalize status', { err }));

          logger.warn('Machine polling timeout - marking as running', { appName });
        }
      }, 5000);

    } catch (error) {
      logger.error('Fly.io deployment error', {
        appName,
        projectId,
        error: error.message
      });

      await supabaseServer
        .from('fly_preview_apps')
        .update({
          status: 'error',
          error_message: error.message || 'Failed to deploy to Fly.io',
        })
        .eq('id', previewAppId)
        .catch(err => logger.error('Failed to update error status', { err }));
    }
  }, 100);
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    let projectId = searchParams.get('projectId');
    const repoParam = searchParams.get('repo'); // Format: owner/repo
    const branchParam = searchParams.get('branch');

    // If no projectId provided but repo/branch are, use them directly
    if (!projectId && repoParam && branchParam) {
      projectId = `preview-${user.id}-${Date.now()}`;
      logger.info('Using repo/branch directly for preview', { repo: repoParam, branch: branchParam, projectId });
    } else if (!projectId) {
      projectId = `preview-${user.id}-${Date.now()}`;
      logger.warn('No projectId or repo/branch provided, using generated ID', { projectId });
    }

    // Check if preview app record exists
    const { data: existingApp, error: queryError } = await supabaseServer
      .from('fly_preview_apps')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    // If app exists, return it
    if (existingApp && !queryError) {
      return NextResponse.json({
        success: true,
        app: {
          id: existingApp.id,
          projectId: existingApp.project_id,
          appName: existingApp.fly_app_name,
          previewUrl: existingApp.preview_url,
          status: existingApp.status,
          errorMessage: existingApp.error_message,
        },
      });
    }

    // Check if Fly.io is configured
    if (!isFlyIOConfigured()) {
      return NextResponse.json(
        { error: 'Fly.io is not configured. Preview deployment is not available.' },
        { status: 503 }
      );
    }

    // Get project details (optional - may not exist yet)
    let project = null;
    try {
      const { data } = await supabaseServer
        .from('projects')
        .select('id, repository_url, repository_name, working_branch, name, github_url, github_branch')
        .eq('id', projectId)
        .single();
      project = data;
    } catch (err) {
      // Silently handle not found
      project = null;
    }

    // Handle both old (github_url) and new (repository_url) schema
    // If project doesn't exist, try to construct from context or use params
    let repositoryUrl = project?.repository_url || project?.github_url;
    let workingBranch = project?.working_branch || project?.github_branch || 'main';
    const projectName = project?.name || `Preview-${projectId.slice(0, 8)}`;

    // Override with query params if provided (for direct Fly preview from component)
    if (repoParam) {
      repositoryUrl = `https://github.com/${repoParam}`;
    }
    if (branchParam) {
      workingBranch = branchParam;
    }

    // Log what we have
    logger.info('Preview app provisioning', {
      projectId,
      repositoryUrl,
      workingBranch,
      projectName,
      hasProject: !!project,
    });

    if (!repositoryUrl) {
      throw new ValidationError('Project does not have a GitHub repository configured');
    }

    // Check if a preview app already exists for this working_branch
    // This prevents duplicate deployments for the same branch
    const { data: existingPreviewForBranch, error: branchError } = await supabaseServer
      .from('fly_preview_apps')
      .select('*')
      .eq('project_id', projectId)
      .eq('github_branch', workingBranch)
      .eq('user_id', user.id)
      .eq('status', 'running')
      .single();

    if (existingPreviewForBranch && !branchError) {
      // Reuse existing deployment for this branch
      return NextResponse.json({
        success: true,
        app: {
          id: existingPreviewForBranch.id,
          projectId: existingPreviewForBranch.project_id,
          appName: existingPreviewForBranch.fly_app_name,
          previewUrl: existingPreviewForBranch.preview_url,
          status: existingPreviewForBranch.status,
          errorMessage: existingPreviewForBranch.error_message,
        },
        reused: true,
        message: 'Using existing deployment for this branch',
      });
    }

    // Generate unique app name and preview URL
    // Use working_branch in the app name to allow multiple deployments per project
    const appName = `${generatePreviewAppName(user.id, projectId)}-${workingBranch.slice(0, 8)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 32);
    const previewUrl = generatePreviewUrl(appName);

    // Create preview app record with deployment config
    const { data: newApp, error: insertError } = await supabaseServer
      .from('fly_preview_apps')
      .insert({
        project_id: projectId,
        user_id: user.id,
        fly_app_name: appName,
        fly_app_id: appName,
        github_repo_url: repositoryUrl,
        github_branch: workingBranch,
        status: 'pending',
        preview_url: previewUrl,
        env_variables: JSON.stringify({
          GITHUB_REPO: repositoryUrl,
          BRANCH: workingBranch,
          PROJECT_ID: projectId,
          PROJECT_NAME: projectName,
          NODE_ENV: 'production',
        }),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to create preview app record', { error: insertError });
      throw new ExternalServiceError(
        'Database',
        'Failed to create preview app record',
        { statusCode: 500 }
      );
    }

    // Trigger background deployment
    triggerDeploymentBackground(
      projectId,
      appName,
      repositoryUrl,
      workingBranch,
      newApp.id,
      user.id
    );

    return NextResponse.json({
      success: true,
      app: {
        id: newApp.id,
        projectId: newApp.project_id,
        appName: newApp.fly_app_name,
        previewUrl: newApp.preview_url,
        status: newApp.status,
        errorMessage: newApp.error_message,
      },
    });
  } catch (error) {
    logger.error('GET /api/fly-preview failed', { error: error.message });

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
      { error: 'Failed to provision preview app' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');

    if (!appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      );
    }

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

    // Destroy the Fly.io app
    try {
      if (isFlyIOConfigured() && app.fly_app_name) {
        await destroyDeployment(app.fly_app_name);
        logger.info('Destroyed Fly.io app', { appName: app.fly_app_name });
      }
    } catch (destroyError) {
      logger.warn('Could not destroy Fly.io app', {
        appName: app.fly_app_name,
        error: destroyError.message
      });
      // Continue anyway - mark as stopped in database
    }

    // Update status to stopped
    const { error: deleteError } = await supabaseServer
      .from('fly_preview_apps')
      .update({ status: 'stopped' })
      .eq('id', appId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Preview app destroyed',
      appName: app.fly_app_name,
    });
  } catch (error) {
    logger.error('DELETE /api/fly-preview failed', { error: error.message });

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

    return NextResponse.json(
      { error: 'Failed to destroy preview app' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { appId, action } = body;

    if (!appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      );
    }

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

    // Handle status check
    if (action === 'status' && isFlyIOConfigured() && app.fly_app_name) {
      try {
        const flyStatus = await getDeploymentStatus(app.fly_app_name);
        return NextResponse.json({
          success: true,
          app: {
            id: app.id,
            projectId: app.project_id,
            appName: app.fly_app_name,
            previewUrl: app.preview_url,
            status: app.status,
            errorMessage: app.error_message,
          },
          flyStatus,
        });
      } catch (statusError) {
        logger.warn('Could not fetch Fly.io status', {
          appName: app.fly_app_name,
          error: statusError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        projectId: app.project_id,
        appName: app.fly_app_name,
        previewUrl: app.preview_url,
        status: app.status,
        errorMessage: app.error_message,
      },
    });
  } catch (error) {
    logger.error('POST /api/fly-preview failed', { error: error.message });

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get preview app status' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
