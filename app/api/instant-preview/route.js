import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';
import { deployToFlyIO, getDeploymentStatus, isFlyIOConfigured } from '@/lib/flyio-deployment';
import { detectProjectType } from '@/lib/project-detector';
import { createDefaultContract } from '@/lib/preview-contract';
import { Octokit } from 'octokit';
import crypto from 'crypto';

const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN || process.env.GITHUB_ACCESS_TOKEN;

function generatePreviewAppName(projectId) {
  const hash = crypto
    .createHash('md5')
    .update(`preview-${projectId}`)
    .digest('hex')
    .slice(0, 8);
  return `preview-${hash}`;
}

function generatePreviewUrl(appName) {
  return `https://${appName}.fly.dev`;
}

/**
 * Instant Preview API - No authentication required
 * 
 * This endpoint boots a Fly.io machine immediately and returns the URL
 * Perfect for when you just want to see a live preview without auth overhead
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const repoParam = searchParams.get('repo'); // Format: owner/repo
    const branchParam = searchParams.get('branch');

    // Validate required parameters
    if (!projectId || !repoParam || !branchParam) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          required: ['projectId', 'repo (owner/repo)', 'branch']
        },
        { status: 400 }
      );
    }

    // Check if Fly.io is configured
    if (!isFlyIOConfigured()) {
      return NextResponse.json(
        { error: 'Fly.io is not configured. Please set FLY_IO_TOKEN.' },
        { status: 503 }
      );
    }

    logger.info('Instant preview request', {
      projectId,
      repo: repoParam,
      branch: branchParam,
    });

    // Parse repo
    const [owner, repo] = repoParam.split('/');
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Invalid repo format. Use owner/repo' },
        { status: 400 }
      );
    }

    const repositoryUrl = `https://github.com/${owner}/${repo}`;

    // Generate app name
    const appName = generatePreviewAppName(projectId);
    const previewUrl = generatePreviewUrl(appName);

    logger.info('Generated preview app name', { appName, previewUrl });

    // Check if preview app already exists
    let existingApp = null;
    try {
      const { data } = await supabaseServer
        .from('fly_preview_apps')
        .select('*')
        .eq('fly_app_name', appName)
        .maybeSingle();
      
      if (data) {
        existingApp = data;
        logger.info('Found existing preview app', { appName, status: data.status });
        
        // If it's already running, just return it
        if (data.status === 'running') {
          return NextResponse.json({
            success: true,
            appName: data.fly_app_name,
            previewUrl: data.preview_url,
            status: data.status,
            message: 'Preview is already running',
          });
        }
      }
    } catch (err) {
      logger.warn('Could not check existing app', { error: err.message });
    }

    // Detect project type
    let projectType = { type: 'node' };
    try {
      if (GITHUB_TOKEN) {
        projectType = await detectProjectType(owner, repo, branchParam, GITHUB_TOKEN);
        logger.info('Detected project type', { type: projectType.type });
      }
    } catch (err) {
      logger.warn('Could not detect project type, using default', { error: err.message });
    }

    // Load or create contract
    let contract = null;
    if (GITHUB_TOKEN) {
      try {
        const octokit = new Octokit({ auth: GITHUB_TOKEN });
        const contractResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: '.roseram/preview.json',
          ref: branchParam,
        });
        const contractContent = Buffer.from(contractResponse.data.content, 'base64').toString('utf-8');
        contract = JSON.parse(contractContent);
        logger.info('Loaded preview contract from repository', { appName });
      } catch (err) {
        if (err.status === 404) {
          contract = createDefaultContract(projectType.type);
          logger.info('No contract found, using default', { type: projectType.type, appName });
        } else {
          logger.warn('Error loading contract, using default', { error: err.message });
          contract = createDefaultContract(projectType.type);
        }
      }
    } else {
      contract = createDefaultContract(projectType.type);
    }

    // Create preview app record
    let previewAppId = existingApp?.id;
    if (!previewAppId) {
      try {
        const { data: newApp, error: insertError } = await supabaseServer
          .from('fly_preview_apps')
          .insert({
            project_id: projectId,
            fly_app_name: appName,
            fly_app_id: appName,
            github_repo_url: repositoryUrl,
            github_branch: branchParam,
            status: 'pending',
            preview_url: previewUrl,
            config_contract: contract,
            env_variables: JSON.stringify({
              GITHUB_REPO: repositoryUrl,
              BRANCH: branchParam,
              PROJECT_ID: projectId,
              NODE_ENV: 'production',
            }),
          })
          .select()
          .single();

        if (insertError) {
          logger.warn('Could not create preview app record', { error: insertError });
        } else {
          previewAppId = newApp.id;
        }
      } catch (err) {
        logger.warn('Error creating app record', { error: err.message });
      }
    }

    // Boot the machine in background - don't wait for it
    bootPreviewInBackground(
      appName,
      repositoryUrl,
      branchParam,
      contract,
      previewAppId,
      projectId
    );

    // Return the preview URL immediately
    return NextResponse.json({
      success: true,
      appName,
      previewUrl,
      status: 'launching',
      message: 'Preview machine is launching. This may take 30-60 seconds to be fully accessible.',
      repo: repoParam,
      branch: branchParam,
      appId: previewAppId,
    });
  } catch (error) {
    logger.error('Instant preview request failed', { error: error.message });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to launch preview',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Boot preview machine in background without blocking response
 */
async function bootPreviewInBackground(appName, repoUrl, branch, contract, appId, projectId) {
  // Don't wait for this - return immediately to user
  setTimeout(async () => {
    try {
      logger.info('Starting background deployment', {
        appName,
        projectId,
      });

      // Deploy to Fly.io
      const result = await deployToFlyIO(
        appName,
        repoUrl,
        branch,
        contract,
        {
          GITHUB_REPO: repoUrl,
          BRANCH: branch,
          PROJECT_ID: projectId,
          NODE_ENV: 'production',
        }
      );

      logger.info('Background deployment completed', {
        appName,
        result,
      });

      // Update database with deployed status
      if (appId) {
        await supabaseServer
          .from('fly_preview_apps')
          .update({
            status: 'deployed',
          })
          .eq('id', appId)
          .catch(err => logger.error('Failed to update status', { err }));
      }

      // Poll for machine readiness
      let pollCount = 0;
      const maxPolls = 60; // 5 minutes

      const pollInterval = setInterval(async () => {
        pollCount++;

        try {
          const status = await getDeploymentStatus(appName);

          if (status.machineState === 'started' || (status.deployed && status.appStatus !== 'pending')) {
            clearInterval(pollInterval);

            if (appId) {
              await supabaseServer
                .from('fly_preview_apps')
                .update({ status: 'running' })
                .eq('id', appId)
                .catch(err => logger.error('Failed to update running status', { err }));
            }

            logger.info('Preview machine is now running', { appName });
          }
        } catch (pollErr) {
          logger.error('Poll error', { appName, error: pollErr.message });
        }

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          logger.warn('Poll timeout, marking as running', { appName });

          if (appId) {
            await supabaseServer
              .from('fly_preview_apps')
              .update({ status: 'running' })
              .eq('id', appId)
              .catch(err => logger.error('Failed to update final status', { err }));
          }
        }
      }, 5000);
    } catch (error) {
      logger.error('Background deployment failed', {
        appName,
        error: error.message,
      });

      if (appId) {
        await supabaseServer
          .from('fly_preview_apps')
          .update({
            status: 'error',
            error_message: error.message,
          })
          .eq('id', appId)
          .catch(err => logger.error('Failed to update error status', { err }));
      }
    }
  }, 100); // Start immediately but don't block
}

export async function POST(request) {
  return NextResponse.json(
    { error: 'Use GET method for instant preview' },
    { status: 405 }
  );
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
