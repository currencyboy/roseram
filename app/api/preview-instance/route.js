import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  if (!supabaseServer) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data?.user;
}

async function detectPackageJson(owner, repo, branch, token) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3.raw',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { exists: false, error: 'package.json not found in repository' };
      }
      return { exists: false, error: 'Failed to check for package.json' };
    }

    const content = await response.text();
    const packageJson = JSON.parse(content);

    return {
      exists: true,
      packageJson,
      scripts: packageJson.scripts || {},
      startScript: packageJson.scripts?.dev || packageJson.scripts?.start,
      buildScript: packageJson.scripts?.build,
      hasWorkspaces: !!(packageJson.workspaces || packageJson.pnpm?.overrides),
    };
  } catch (err) {
    return {
      exists: false,
      error: `Failed to parse package.json: ${err.message}`
    };
  }
}

async function detectPackageManager(owner, repo, branch, token) {
  const lockFiles = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm', installCmd: 'pnpm install' },
    { file: 'yarn.lock', manager: 'yarn', installCmd: 'yarn install' },
    { file: 'package-lock.json', manager: 'npm', installCmd: 'npm ci' },
  ];

  for (const { file, manager, installCmd } of lockFiles) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3.raw',
          },
        }
      );

      if (response.ok) {
        return { manager, installCmd };
      }
    } catch (err) {
      // Continue to next lock file
    }
  }

  // Default to npm
  return { manager: 'npm', installCmd: 'npm ci' };
}

async function spawnPreviewInstance(request, owner, repo, branch, githubToken) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return {
        success: false,
        error: 'Authentication failed',
        guidance: 'Please ensure you are signed in.',
      };
    }

    // Detect package.json
    const packageInfo = await detectPackageJson(owner, repo, branch, githubToken);

    if (!packageInfo.exists) {
      return {
        success: false,
        error: packageInfo.error,
        guidance: 'This repository does not appear to be a Node.js project. Ensure it has a package.json in the root directory.',
        detectedScript: null,
      };
    }

    // Check for start script
    if (!packageInfo.startScript) {
      return {
        success: false,
        error: 'No start script found in package.json',
        guidance: 'Add a "dev" or "start" script to package.json. Example: "dev": "next dev" or "start": "node server.js"',
        availableScripts: Object.keys(packageInfo.scripts || {}),
        packageJson: packageInfo.packageJson,
      };
    }

    // Detect package manager
    const { manager: packageManager, installCmd } = await detectPackageManager(owner, repo, branch, githubToken);

    // Generate unique instance identifier
    const instanceId = `${owner}-${repo}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 32);

    // Build deployment commands
    const deploymentConfig = {
      packageManager,
      installCommand: installCmd,
      buildCommand: packageInfo.buildScript ? `${getPackageManagerExec(packageManager)} ${packageInfo.buildScript}` : null,
      startCommand: getStartCommand(packageManager, packageInfo.startScript),
      hasWorkspaces: packageInfo.hasWorkspaces,
    };

    // Spawn Fly Machine with the repository
    const machineConfig = {
      image: 'node:18-alpine',
      cmd: [
        '/bin/sh',
        '-c',
        `git clone --depth 1 --branch ${branch} https://${githubToken}@github.com/${owner}/${repo}.git /app && cd /app && ${installCmd} && ${deploymentConfig.buildCommand || ''} && ${deploymentConfig.startCommand}`
      ],
      env: {
        REPO: `${owner}/${repo}`,
        BRANCH: branch,
        NODE_ENV: 'production',
        PACKAGE_MANAGER: packageManager,
      },
      services: [
        {
          protocol: 'tcp',
          internal_port: 3000,
          ports: [
            {
              port: 80,
              handlers: ['http'],
              force_https: false,
            },
            {
              port: 443,
              handlers: ['tls', 'http'],
            },
          ],
        },
      ],
    };

    return {
      success: true,
      instanceId,
      previewUrl: `https://${instanceId}.fly.dev`,
      detectedScript: packageInfo.startScript,
      packageManager,
      buildScript: packageInfo.buildScript,
      deploymentConfig,
      guidance: `Preview instance detected. Running ${packageManager}: ${deploymentConfig.startCommand}`,
      machineConfig,
      status: 'configured',
    };
  } catch (err) {
    logger.error('Error spawning preview instance:', err);
    return {
      success: false,
      error: 'Failed to spawn preview instance',
      guidance: `Error: ${err.message}. Please check your repository is accessible and contains valid configuration.`,
    };
  }
}

function getPackageManagerExec(manager) {
  switch (manager) {
    case 'pnpm':
      return 'pnpm exec';
    case 'yarn':
      return 'yarn exec';
    case 'npm':
    default:
      return 'npx';
  }
}

function getStartCommand(manager, script) {
  if (!script) return `${manager} start`;

  switch (manager) {
    case 'pnpm':
      return `pnpm ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    case 'npm':
    default:
      return `npm run ${script}`;
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          guidance: 'Please ensure you are signed in.',
          details: 'Your session may have expired. Try refreshing the page and signing in again.'
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { owner, repo, branch, githubToken } = body;

    if (!owner || !repo || !branch || !githubToken) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          guidance: 'Repository owner, name, branch, and GitHub token are required.',
          missing: {
            owner: !owner,
            repo: !repo,
            branch: !branch,
            githubToken: !githubToken,
          }
        },
        { status: 400 }
      );
    }

    const result = await spawnPreviewInstance(request, owner, repo, branch, githubToken);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    logger.error('Preview instance error:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        guidance: 'Please try again later or contact support.',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
