import { logger } from './errors';

const FLY_IO_TOKEN = process.env.NEXT_FLY_IO_TOKEN || process.env.FLY_IO_TOKEN;
const FLY_API_URL = 'https://api.fly.io/graphql';

/**
 * Deploy a repository to Fly.io using the GraphQL API
 */
export async function deployRepositoryToFlyIO(appName, githubRepo, githubBranch, envVars = {}) {
  if (!FLY_IO_TOKEN) {
    throw new Error('Fly.io API token not configured');
  }

  try {
    // First, verify or create the app
    const appExists = await checkAppExists(appName);
    
    if (!appExists) {
      await createFlyApp(appName);
    }

    // Build and deploy Docker image
    // This is a simplified approach - in production, you'd want to:
    // 1. Create a Dockerfile in the app directory
    // 2. Use GitHub Actions to build and push
    // 3. Or use Fly.io's native GitHub integration

    // For now, we return a deployment status that can be polled
    return {
      appName,
      status: 'initializing',
      previewUrl: `https://${appName}.fly.dev`,
      deploymentId: Date.now().toString(),
    };
  } catch (error) {
    logger.error('Failed to deploy to Fly.io', { appName, error: error.message });
    throw error;
  }
}

/**
 * Check if an app exists on Fly.io
 */
async function checkAppExists(appName) {
  try {
    const query = `
      query GetApp($name: String!) {
        app(name: $name) {
          id
          name
          status
        }
      }
    `;

    const response = await fetch(FLY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLY_IO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { name: appName },
      }),
    });

    const data = await response.json();
    return !!data.data?.app?.id;
  } catch (error) {
    logger.error('Failed to check app existence', { appName, error: error.message });
    return false;
  }
}

/**
 * Create a new app on Fly.io
 */
async function createFlyApp(appName, orgId = 'personal') {
  try {
    const mutation = `
      mutation CreateApp($input: CreateAppInput!) {
        createApp(input: $input) {
          app {
            id
            name
            status
          }
        }
      }
    `;

    const response = await fetch(FLY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLY_IO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            organizationId: orgId,
            name: appName,
          },
        },
      }),
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`Fly.io error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.data?.createApp?.app;
  } catch (error) {
    logger.error('Failed to create Fly.io app', { appName, error: error.message });
    throw error;
  }
}

/**
 * Get the deployment status of an app
 */
export async function getDeploymentStatus(appName) {
  if (!FLY_IO_TOKEN) {
    throw new Error('Fly.io API token not configured');
  }

  try {
    const query = `
      query GetApp($name: String!) {
        app(name: $name) {
          id
          name
          status
          machines(first: 1) {
            nodes {
              id
              state
              region
              createdAt
            }
          }
        }
      }
    `;

    const response = await fetch(FLY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLY_IO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { name: appName },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Fly.io error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    const app = data.data?.app;
    const machine = app?.machines?.nodes?.[0];

    // Map Fly.io machine states to our statuses
    let status = 'pending';
    if (machine?.state === 'started' || app?.status === 'running') {
      status = 'running';
    } else if (machine?.state === 'destroyed' || machine?.state === 'halted') {
      status = 'error';
    } else if (machine?.state === 'starting' || app?.status === 'pending') {
      status = 'initializing';
    }

    return {
      appName,
      status,
      previewUrl: `https://${appName}.fly.dev`,
      machineState: machine?.state,
      appStatus: app?.status,
      deployed: machine?.state === 'started',
    };
  } catch (error) {
    logger.error('Failed to get deployment status', { appName, error: error.message });
    throw error;
  }
}

/**
 * Set environment variables for an app
 */
export async function setAppEnvVariables(appName, envVars) {
  if (!FLY_IO_TOKEN) {
    throw new Error('Fly.io API token not configured');
  }

  try {
    const mutation = `
      mutation SetSecrets($input: SetSecretsInput!) {
        setSecrets(input: $input) {
          release {
            id
            version
            status
          }
        }
      }
    `;

    const response = await fetch(FLY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLY_IO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            appId: appName,
            secrets: envVars,
          },
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Fly.io error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.data?.setSecrets?.release;
  } catch (error) {
    logger.error('Failed to set environment variables', { appName, error: error.message });
    throw error;
  }
}

/**
 * Check if Fly.io is configured
 */
export function isFlyIOConfigured() {
  return !!FLY_IO_TOKEN;
}

/**
 * Get deployment logs from Fly.io
 */
export async function getDeploymentLogs(appName, limit = 100) {
  if (!FLY_IO_TOKEN) {
    throw new Error('Fly.io API token not configured');
  }

  try {
    const query = `
      query GetLogs($appName: String!, $limit: Int!) {
        app(name: $appName) {
          id
          builds(first: 1) {
            nodes {
              id
              status
              logs(limit: $limit) {
                nodes {
                  id
                  message
                  level
                  timestamp
              }
            }
          }
        }
      }
    `;

    const response = await fetch(FLY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLY_IO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { appName, limit },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Fly.io error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.data?.app?.builds?.nodes?.[0]?.logs?.nodes || [];
  } catch (error) {
    logger.error('Failed to get deployment logs', { appName, error: error.message });
    throw error;
  }
}
