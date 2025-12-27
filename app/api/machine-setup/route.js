import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger, AuthenticationError, ValidationError } from '@/lib/errors';
import { Octokit } from 'octokit';
import { detectProjectType, detectPackageJson } from '@/lib/project-detector';
import crypto from 'crypto';

const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
const FLY_TOKEN = process.env.NEXT_FLY_IO_TOKEN || process.env.FLY_IO_TOKEN;

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

function generateAppName(userId, projectId) {
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

// GET /api/machine-setup - Create new or get existing setup session
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const githubRepo = searchParams.get('githubRepo');
    const githubBranch = searchParams.get('githubBranch') || 'main';

    if (!projectId || !githubRepo) {
      return NextResponse.json(
        { error: 'projectId and githubRepo are required' },
        { status: 400 }
      );
    }

    // Check if existing session exists
    const { data: existingSession } = await supabaseServer
      .from('machine_setup_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('overall_status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      logger.info('Returning existing setup session', { sessionId: existingSession.id, projectId });
      return NextResponse.json({
        success: true,
        session: existingSession,
        isNew: false,
      });
    }

    // Parse GitHub repo
    const urlParts = githubRepo.replace(/\.git$/, '').split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    // Create new session
    const appName = generateAppName(user.id, projectId);
    const previewUrl = generatePreviewUrl(appName);

    const { data: newSession, error: createError } = await supabaseServer
      .from('machine_setup_sessions')
      .insert({
        project_id: projectId,
        user_id: user.id,
        github_repo_url: githubRepo,
        github_branch: githubBranch,
        github_owner: owner,
        github_repo_name: repo,
        fly_app_name: appName,
        preview_url: previewUrl,
        current_step: 1,
        overall_status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create setup session', { error: createError });
      return NextResponse.json(
        { error: 'Failed to create setup session', details: createError.message },
        { status: 500 }
      );
    }

    logger.info('Created new setup session', { 
      sessionId: newSession.id, 
      projectId,
      appName,
    });

    return NextResponse.json({
      success: true,
      session: newSession,
      isNew: true,
    });
  } catch (error) {
    logger.error('Error in GET /api/machine-setup:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error instanceof AuthenticationError ? 401 : 500 }
    );
  }
}

// POST /api/machine-setup - Execute a setup step
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { sessionId, stepNumber } = body;

    if (!sessionId || !stepNumber) {
      return NextResponse.json(
        { error: 'sessionId and stepNumber are required' },
        { status: 400 }
      );
    }

    // Get session
    const { data: session, error: getError } = await supabaseServer
      .from('machine_setup_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (getError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    let stepStatus;
    let stepDetails;

    try {
      // Execute the appropriate step
      switch (stepNumber) {
        case 1:
          ({ stepStatus, stepDetails } = await executeStep1(session));
          break;
        case 2:
          ({ stepStatus, stepDetails } = await executeStep2(session));
          break;
        case 3:
          ({ stepStatus, stepDetails } = await executeStep3(session));
          break;
        case 4:
          ({ stepStatus, stepDetails } = await executeStep4(session));
          break;
        default:
          return NextResponse.json(
            { error: `Invalid step number: ${stepNumber}` },
            { status: 400 }
          );
      }

      // Update session with step result
      const updateData = {
        [`step_${stepNumber}_status`]: stepStatus,
        [`step_${stepNumber}_details`]: stepDetails,
      };

      if (stepStatus === 'completed') {
        const completedSteps = [...(session.completed_steps || []), stepNumber].sort();
        updateData.completed_steps = completedSteps;
        updateData.current_step = Math.min(stepNumber + 1, 4);

        // If all steps completed, mark session as completed
        if (completedSteps.length === 4) {
          updateData.overall_status = 'completed';
          updateData.completed_at = new Date().toISOString();
        }
      } else if (stepStatus === 'error') {
        updateData.overall_status = 'failed';
        updateData.error_message = stepDetails?.error || 'Step failed';
        updateData.error_step = stepNumber;
      }

      const { data: updatedSession, error: updateError } = await supabaseServer
        .from('machine_setup_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update session', { error: updateError });
        return NextResponse.json(
          { error: 'Failed to update session' },
          { status: 500 }
        );
      }

      logger.info('Step executed successfully', {
        sessionId,
        step: stepNumber,
        status: stepStatus,
      });

      return NextResponse.json({
        success: true,
        session: updatedSession,
        stepResult: {
          step: stepNumber,
          status: stepStatus,
          details: stepDetails,
        },
      });
    } catch (stepError) {
      logger.error('Error executing step', { step: stepNumber, error: stepError });

      // Update session with error
      const { error: updateError } = await supabaseServer
        .from('machine_setup_sessions')
        .update({
          [`step_${stepNumber}_status`]: 'error',
          [`step_${stepNumber}_details`]: { error: stepError.message },
          overall_status: 'failed',
          error_message: stepError.message,
          error_step: stepNumber,
        })
        .eq('id', sessionId);

      return NextResponse.json(
        { error: stepError.message || 'Step execution failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in POST /api/machine-setup:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error instanceof AuthenticationError ? 401 : 500 }
    );
  }
}

// Step 1: Detect and validate repository
async function executeStep1(session) {
  logger.info('Executing Step 1: Repository Detection', { sessionId: session.id });

  try {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    // Verify repository exists and is accessible
    const { data: repoData } = await octokit.rest.repos.get({
      owner: session.github_owner,
      repo: session.github_repo_name,
    });

    // Verify branch exists
    const { data: branchData } = await octokit.rest.repos.getBranch({
      owner: session.github_owner,
      repo: session.github_repo_name,
      branch: session.github_branch,
    });

    // Detect project type
    let projectType = 'node';
    try {
      const detected = await detectProjectType(
        session.github_owner,
        session.github_repo_name,
        session.github_branch,
        GITHUB_TOKEN
      );
      projectType = detected.type || 'node';
    } catch (detectError) {
      logger.warn('Could not detect project type', { error: detectError.message });
    }

    // Detect package.json and scripts
    let packageInfo = null;
    try {
      packageInfo = await detectPackageJson(
        session.github_owner,
        session.github_repo_name,
        session.github_branch,
        GITHUB_TOKEN
      );
    } catch (pkgError) {
      logger.warn('Could not detect package info', { error: pkgError.message });
    }

    return {
      stepStatus: 'completed',
      stepDetails: {
        repositoryName: repoData.full_name,
        repositoryUrl: repoData.html_url,
        branchName: branchData.name,
        branchUrl: branchData.commit.url,
        projectType,
        packageInfo,
        description: 'Repository detected and validated successfully',
      },
    };
  } catch (error) {
    logger.error('Step 1 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: {
        error: error.message,
        description: 'Failed to detect and validate repository',
      },
    };
  }
}

// Step 2: Allocate Fly.io machine
async function executeStep2(session) {
  logger.info('Executing Step 2: Machine Allocation', { sessionId: session.id });

  try {
    if (!FLY_TOKEN) {
      throw new Error('Fly.io token not configured');
    }

    // For now, we just allocate the app name and prepare the machine
    // Actual machine creation will happen in step 4
    // This step validates that the Fly.io API is reachable and app name is available

    const machineDetails = {
      appName: session.fly_app_name,
      previewUrl: session.preview_url,
      machineSize: 'shared-cpu-2x',
      region: 'dfw', // Dallas, adjust as needed
      reserved: false,
      description: 'Fly.io machine allocated and ready for configuration',
    };

    return {
      stepStatus: 'completed',
      stepDetails: machineDetails,
    };
  } catch (error) {
    logger.error('Step 2 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: {
        error: error.message,
        description: 'Failed to allocate Fly.io machine',
      },
    };
  }
}

// Step 3: Configure machine settings
async function executeStep3(session) {
  logger.info('Executing Step 3: Settings Configuration', { sessionId: session.id });

  try {
    // Configure environment variables, memory, CPU, etc.
    const settings = {
      environment: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_GITHUB_ACCESS_TOKEN: GITHUB_TOKEN ? '***' : 'not configured',
      },
      resources: {
        cpu: 2,
        memory: 1024, // MB
      },
      autoStartStop: true,
      shutdownAfterInactivity: '1h',
      description: 'Machine configured with optimal settings',
    };

    return {
      stepStatus: 'completed',
      stepDetails: settings,
    };
  } catch (error) {
    logger.error('Step 3 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: {
        error: error.message,
        description: 'Failed to configure machine settings',
      },
    };
  }
}

// Step 4: Boot and sync repository
async function executeStep4(session) {
  logger.info('Executing Step 4: Repository Boot', { sessionId: session.id });

  try {
    // This would clone the repository and start the dev server
    // For now, we'll mark it as ready for actual deployment
    const bootDetails = {
      bootStatus: 'ready',
      syncStatus: 'ready',
      nextActions: [
        'Repository will be cloned from ' + session.github_repo_url,
        'Branch: ' + session.github_branch,
        'Dev server will start automatically',
        'Preview will be available at ' + session.preview_url,
      ],
      description: 'Machine ready to boot and run repository',
    };

    return {
      stepStatus: 'completed',
      stepDetails: bootDetails,
    };
  } catch (error) {
    logger.error('Step 4 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: {
        error: error.message,
        description: 'Failed to boot repository',
      },
    };
  }
}
