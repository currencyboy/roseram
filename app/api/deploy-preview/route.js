import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';
import { Octokit } from 'octokit';
import { detectProjectType, detectPackageJson } from '@/lib/project-detector';
import { validateContract, createDefaultContract } from '@/lib/preview-contract';
import { deployToFlyIO, isFlyIOConfigured } from '@/lib/flyio-deployment';

const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
const FLY_TOKEN = process.env.NEXT_FLY_IO_TOKEN || process.env.FLY_IO_TOKEN;

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!supabaseServer) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  return data?.user;
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', guidance: 'Please sign in to deploy previews' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { appId } = body;

    if (!appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      );
    }

    // Get preview app details
    const { data: app, error: queryError } = await supabaseServer
      .from('fly_preview_apps')
      .select('*')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (queryError || !app) {
      logger.error('App not found', { appId, userId: user.id, error: queryError });
      return NextResponse.json(
        { error: 'App not found or access denied' },
        { status: 404 }
      );
    }

    // Update status to initializing
    const { error: updateError } = await supabaseServer
      .from('fly_preview_apps')
      .update({
        status: 'initializing',
        last_deployment_at: new Date().toISOString(),
      })
      .eq('id', appId);

    if (updateError) {
      logger.error('Failed to update app status', { appId, error: updateError });
      return NextResponse.json(
        { error: 'Failed to initialize deployment', details: updateError.message },
        { status: 500 }
      );
    }

    // Parse GitHub repository information
    const repoUrl = app.github_repo_url;
    const urlParts = repoUrl.replace(/\.git$/, '').split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];

    if (!owner || !repo) {
      return NextResponse.json(
        { 
          error: 'Invalid GitHub repository URL',
          guidance: 'Repository URL should be https://github.com/owner/repo'
        },
        { status: 400 }
      );
    }

    // Check if GitHub token is configured
    if (!GITHUB_TOKEN) {
      logger.error('GitHub token not configured');

      const { error: statusError } = await supabaseServer
        .from('fly_preview_apps')
        .update({
          status: 'error',
          error_message: 'GitHub token not configured on server'
        })
        .eq('id', appId);

      if (statusError) {
        logger.error('Failed to update error status', { appId, error: statusError });
      }

      return NextResponse.json(
        {
          error: 'GitHub token not configured',
          details: 'The server is missing GitHub credentials. Contact your administrator to configure the GitHub token.',
          guidance: 'Server is missing GitHub credentials for deployment'
        },
        { status: 503 }
      );
    }

    try {
      logger.info('Starting Fly.io dev environment setup', {
        appId,
        appName: app.fly_app_name,
        owner,
        repo,
        branch: app.github_branch,
      });

      // Step 1: Detect project type
      const projectType = await detectProjectType(owner, repo, app.github_branch, GITHUB_TOKEN);
      logger.info('Project type detected', { appId, projectType });

      // Step 2: Try to fetch preview contract, or create default based on type
      const octokit = new Octokit({ auth: GITHUB_TOKEN });
      let contract = null;

      try {
        const contractResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: '.roseram/preview.json',
          ref: app.github_branch,
        });

        const contractContent = Buffer.from(contractResponse.data.content, 'base64').toString('utf-8');
        contract = JSON.parse(contractContent);
        validateContract(contract);
        logger.info('Preview contract found', { appId, contract });
      } catch (err) {
        if (err.status === 404) {
          // No contract found, create default based on detected type
          contract = createDefaultContract(projectType.type);
          logger.info('No preview contract found, using default', { appId, type: projectType.type, contract });
        } else {
          throw new Error(`Failed to read preview contract: ${err.message}`);
        }
      }

      // Step 3: Check if Fly.io is configured
      if (!isFlyIOConfigured()) {
        throw new Error('Fly.io is not configured. Please ensure FLY_IO_TOKEN is set in environment variables.');
      }

      // Step 4: Boot Fly Machine with dev environment
      logger.info('Booting Fly Machine with contract', {
        appId,
        appName: app.fly_app_name,
        contract,
        repoUrl: app.github_repo_url,
        branch: app.github_branch,
      });

      // Deploy to Fly.io
      const deployResult = await deployToFlyIO(
        app.fly_app_name,
        app.github_repo_url,
        app.github_branch,
        contract,
        {
          GITHUB_REPO: app.github_repo_url,
          BRANCH: app.github_branch,
          PROJECT_ID: projectId,
          NODE_ENV: 'production',
        }
      );

      logger.info('Deployment result received', {
        appId,
        appName: app.fly_app_name,
        deployResult,
      });

      // Update preview app with contract and metadata
      const { error: updateError } = await supabaseServer
        .from('fly_preview_apps')
        .update({
          status: 'deployed',
          config_contract: contract,
          metadata: {
            projectType: projectType.type,
            detectedFiles: projectType.files,
            deployResult: deployResult,
          },
        })
        .eq('id', appId);

      if (updateError) {
        throw updateError;
      }

      logger.info('Dev environment booted successfully', {
        appId,
        appName: app.fly_app_name,
        previewUrl: `https://${app.fly_app_name}.fly.dev`,
      });

      return NextResponse.json({
        success: true,
        message: 'Dev environment deployment started',
        appId,
        appName: app.fly_app_name,
        previewUrl: `https://${app.fly_app_name}.fly.dev`,
        projectType: projectType.type,
        contract: contract,
        deploymentStatus: deployResult,
        guidance: 'Your dev environment is deploying. Machines are being provisioned and the dev server is starting. This may take 10-30 seconds.',
      });

    } catch (error) {
      logger.error('Dev environment setup failed', {
        appId,
        owner,
        repo,
        error: error.message,
      });

      let errorMessage = 'Failed to start dev environment';
      let errorDetails = error.message;

      if (error.message.includes('project type')) {
        errorMessage = 'Unable to detect project type';
        errorDetails = 'Could not automatically determine your project type. Ensure the repository contains standard configuration files (package.json, requirements.txt, etc.)';
      } else if (error.message.includes('preview contract')) {
        errorMessage = 'Invalid preview contract';
        errorDetails = 'The .roseram/preview.json file is invalid. Please check the format and required fields.';
      }

      // Update app status to error
      const { error: statusError } = await supabaseServer
        .from('fly_preview_apps')
        .update({
          status: 'error',
          error_message: errorMessage
        })
        .eq('id', appId);

      if (statusError) {
        logger.error('Failed to update error status', { appId, error: statusError });
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
          guidance: 'Check your repository structure and ensure it has a valid configuration file.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Deploy preview endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        guidance: 'Please try again later or contact support',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
