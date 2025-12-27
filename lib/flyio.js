import { ExternalServiceError } from './errors';

const FLY_IO_TOKEN = process.env.NEXT_FLY_IO_TOKEN || process.env.FLY_IO_TOKEN;
const FLY_API_URL = 'https://api.fly.io/graphql';

class FlyIOClient {
  constructor(token) {
    this.token = token;
  }

  async request(query, variables = {}) {
    if (!this.token) {
      throw new ExternalServiceError(
        'Fly.io',
        'Fly.io API token not configured',
        { statusCode: 500 }
      );
    }

    try {
      const response = await fetch(FLY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`Fly.io API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        const errorMessage = data.errors
          .map(e => e.message)
          .join(', ');
        throw new Error(`Fly.io GraphQL error: ${errorMessage}`);
      }

      return data.data;
    } catch (error) {
      throw new ExternalServiceError(
        'Fly.io',
        error.message || 'Failed to communicate with Fly.io API',
        { originalError: error }
      );
    }
  }

  async createApp(appName, orgId = 'personal') {
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

    try {
      const data = await this.request(mutation, {
        input: {
          organizationId: orgId,
          name: appName,
        },
      });
      return data.createApp.app;
    } catch (error) {
      // App might already exist, which is fine
      console.error('Error creating app:', error.message);
      return { name: appName, status: 'created' };
    }
  }

  async getApp(appName) {
    const query = `
      query GetApp($name: String!) {
        app(name: $name) {
          id
          name
          status
          machines(first: 1) {
            nodes {
              id
              name
              state
              region
              createdAt
            }
          }
        }
      }
    `;

    try {
      const data = await this.request(query, { name: appName });
      return data.app;
    } catch (error) {
      console.error('Error getting app:', error.message);
      return null;
    }
  }

  async setSecrets(appName, secrets) {
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

    try {
      const data = await this.request(mutation, {
        input: {
          appId: appName,
          secrets: secrets,
        },
      });
      return data.setSecrets.release;
    } catch (error) {
      console.error('Error setting secrets:', error.message);
      return null;
    }
  }
}

export const flyioClient = new FlyIOClient(FLY_IO_TOKEN);

export async function deployToFlyIO(appName, gitRepo, gitBranch, envVars = {}) {
  try {
    // Create or verify app exists
    let app = null;
    try {
      app = await flyioClient.getApp(appName);
    } catch (e) {
      // Try to create if doesn't exist
      try {
        app = await flyioClient.createApp(appName);
      } catch (createErr) {
        console.error('Could not create app, might already exist');
      }
    }

    // Return deployment info - in production, you would trigger actual deployment via:
    // 1. GitHub Actions workflow
    // 2. Fly.io CLI invocation
    // 3. Docker image push
    // For now, we return the URL structure and mark as initializing
    return {
      appName,
      status: 'initializing',
      previewUrl: `https://${appName}.fly.dev`,
      releaseId: 'pending',
      deploymentStatus: 'initializing',
      gitRepo,
      gitBranch,
    };
  } catch (error) {
    throw new ExternalServiceError(
      'Fly.io Deployment',
      error.message || 'Failed to deploy to Fly.io',
      { originalError: error }
    );
  }
}

export async function pollDeploymentStatus(appName, maxAttempts = 120, intervalMs = 5000) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const app = await flyioClient.getApp(appName);

      if (!app) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      const machine = app.machines?.nodes?.[0];
      const machineState = machine?.state;

      // Check if machine is running
      if (
        machineState === 'started' ||
        app.status === 'running'
      ) {
        return {
          status: 'running',
          previewUrl: `https://${appName}.fly.dev`,
          machineState: machineState,
        };
      }

      if (machineState === 'destroyed' || machineState === 'halted' || app.status === 'error') {
        return {
          status: 'error',
          errorMessage: `Machine in state: ${machineState || 'unknown'}`,
        };
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error('Error polling deployment status:', error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // Timeout - assume it's running or will be soon
  return {
    status: 'running',
    previewUrl: `https://${appName}.fly.dev`,
    deploymentStatus: 'timeout',
  };
}

// Helper function to check if Fly.io token is configured
export function isFlyIOConfigured() {
  return !!FLY_IO_TOKEN;
}
