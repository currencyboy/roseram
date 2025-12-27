/**
 * Fly.io Native Preview Service
 * 
 * Unified preview system that deploys directly to Fly.io
 * without depending on Sprites.dev or any external preview service
 * 
 * This service handles:
 * - App creation and management
 * - Repository cloning and setup
 * - Dev server startup
 * - Live preview URLs
 * - Cleanup and destruction
 */

import { logger } from './errors';

const FLY_TOKEN = process.env.NEXT_FLY_IO_TOKEN || process.env.FLY_IO_TOKEN;
const FLY_API = 'https://api.fly.io/graphql';
const FLY_MACHINES_API = 'https://api.machines.dev/v1';

export class FlyNativePreviewService {
  constructor() {
    if (!FLY_TOKEN) {
      logger.warn('[FlyNativePreview] No Fly.io token configured');
    }
  }

  /**
   * Check if Fly.io is properly configured
   */
  isConfigured() {
    return !!FLY_TOKEN;
  }

  /**
   * GraphQL request to Fly.io API
   */
  async flyRequest(query, variables = {}) {
    if (!FLY_TOKEN) {
      throw new Error('Fly.io token not configured');
    }

    try {
      const response = await fetch(FLY_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FLY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`Fly.io API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        const errorMsg = data.errors.map(e => e.message).join('; ');
        throw new Error(`Fly.io error: ${errorMsg}`);
      }

      return data.data;
    } catch (error) {
      logger.error('[FlyNativePreview] Request failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create or get a Fly.io app for preview
   */
  async createOrGetApp(appName) {
    const query = `
      query GetApp($name: String!) {
        app(name: $name) {
          id
          name
          status
          deployed
        }
      }
    `;

    try {
      const result = await this.flyRequest(query, { name: appName });

      if (result?.app) {
        logger.info('[FlyNativePreview] Found existing app', { appName });
        return result.app;
      }

      // App doesn't exist, create it
      logger.info('[FlyNativePreview] Creating new app', { appName });
      return await this.createApp(appName);
    } catch (error) {
      logger.warn('[FlyNativePreview] Could not get app, attempting creation', { appName, error: error.message });
      return await this.createApp(appName);
    }
  }

  /**
   * Create a new Fly.io app
   */
  async createApp(appName) {
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
      const result = await this.flyRequest(mutation, {
        input: {
          organizationId: 'personal',
          name: appName,
          preferredRegion: 'iad',
        },
      });

      if (result?.createApp?.app) {
        logger.info('[FlyNativePreview] App created successfully', { appName });
        return result.createApp.app;
      }

      throw new Error('Failed to create app');
    } catch (error) {
      logger.error('[FlyNativePreview] App creation failed', { appName, error: error.message });
      throw error;
    }
  }

  /**
   * Set environment variables/secrets for an app
   */
  async setSecrets(appName, secrets) {
    if (!secrets || Object.keys(secrets).length === 0) {
      return;
    }

    const mutation = `
      mutation SetSecrets($input: SetSecretsInput!) {
        setSecrets(input: $input) {
          release {
            id
            status
          }
        }
      }
    `;

    const secretsObj = Object.entries(secrets).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});

    try {
      await this.flyRequest(mutation, {
        input: {
          appId: appName,
          secrets: secretsObj,
        },
      });

      logger.info('[FlyNativePreview] Secrets set', { appName, count: Object.keys(secrets).length });
    } catch (error) {
      logger.warn('[FlyNativePreview] Could not set secrets', { appName, error: error.message });
      // Don't fail deployment if secrets can't be set
    }
  }

  /**
   * Create a machine for the preview app
   */
  async createMachine(appName, machineConfig) {
    if (!FLY_TOKEN) {
      throw new Error('Fly.io token not configured');
    }

    try {
      const response = await fetch(`${FLY_MACHINES_API}/apps/${appName}/machines`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FLY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(machineConfig),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create machine: ${JSON.stringify(error)}`);
      }

      const machine = await response.json();
      logger.info('[FlyNativePreview] Machine created', { appName, machineId: machine.id });
      return machine;
    } catch (error) {
      logger.error('[FlyNativePreview] Machine creation failed', { appName, error: error.message });
      throw error;
    }
  }

  /**
   * Start a machine
   */
  async startMachine(appName, machineId) {
    if (!FLY_TOKEN) {
      throw new Error('Fly.io token not configured');
    }

    try {
      const response = await fetch(
        `${FLY_MACHINES_API}/apps/${appName}/machines/${machineId}/start`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FLY_TOKEN}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to start machine: ${response.status}`);
      }

      logger.info('[FlyNativePreview] Machine started', { appName, machineId });
      return true;
    } catch (error) {
      logger.error('[FlyNativePreview] Machine start failed', { appName, machineId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate boot script for dev server
   */
  generateBootScript(repoUrl, branch, packageManager = 'npm', installCmd = 'npm install', devCmd = 'npm run dev', port = 3000) {
    // Parse repo URL to owner/repo format
    let repoPath = repoUrl;
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
      if (match) {
        repoPath = `${match[1]}/${match[2]}`;
      }
    }

    return `#!/bin/bash
set -e

export PORT=${port}
export NODE_ENV=production

# Clone repository
echo "[Roseram Preview] Cloning repository..."
git clone --depth 1 --branch "${branch}" "https://github.com/${repoPath}.git" /app
cd /app

# Install dependencies
echo "[Roseram Preview] Installing dependencies..."
${installCmd}

# Start dev server
echo "[Roseram Preview] Starting dev server on port $PORT..."
${devCmd}
`;
  }

  /**
   * Deploy a preview
   * Main entry point for creating a full preview deployment
   */
  async deployPreview(appName, repoUrl, branch, options = {}) {
    const {
      packageManager = 'npm',
      installCmd = 'npm install',
      devCmd = 'npm run dev',
      port = 3000,
      cpus = 2,
      memory = 512,
      region = 'iad',
    } = options;

    try {
      logger.info('[FlyNativePreview] Starting deployment', { appName, repoUrl, branch });

      // 1. Create or get app
      const app = await this.createOrGetApp(appName);
      logger.info('[FlyNativePreview] App ready', { appName, appId: app.id });

      // 2. Set environment variables
      await this.setSecrets(appName, {
        PORT: port.toString(),
        GITHUB_REPO: repoUrl,
        BRANCH: branch,
        NODE_ENV: 'production',
      });

      // 3. Generate boot script
      const bootScript = this.generateBootScript(repoUrl, branch, packageManager, installCmd, devCmd, port);

      // 4. Create machine
      const machineConfig = {
        config: {
          image: 'node:20-slim',
          services: [
            {
              ports: [
                {
                  port: port,
                  handlers: ['http'],
                  force_https: false,
                }
              ],
              protocol: 'tcp',
              internal_port: port,
            }
          ],
          env: {
            PORT: String(port),
            NODE_ENV: 'production',
          },
          restart: {
            policy: 'on-failure',
            max_retries: 5,
          },
          auto_destroy: false,
          processes: {
            web: '/bin/bash /startup.sh',
          },
        },
        region: region,
        name: `${appName}-preview`,
      };

      // Write boot script to machine
      machineConfig.config.files = [
        {
          guest_path: '/startup.sh',
          raw_value: bootScript,
        }
      ];

      const machine = await this.createMachine(appName, machineConfig);

      // 5. Start machine
      await this.startMachine(appName, machine.id);

      // 6. Return preview details
      const previewUrl = `https://${appName}.fly.dev`;

      logger.info('[FlyNativePreview] Deployment complete', { appName, machineId: machine.id, previewUrl });

      return {
        success: true,
        appName,
        machineId: machine.id,
        previewUrl,
        status: 'deployed',
      };
    } catch (error) {
      logger.error('[FlyNativePreview] Deployment failed', { appName, error: error.message });
      throw error;
    }
  }

  /**
   * Destroy a preview app
   */
  async destroyPreview(appName) {
    const mutation = `
      mutation DestroyApp($appId: ID!) {
        deleteApp(input: { appId: $appId }) {
          deletedAppId
        }
      }
    `;

    try {
      await this.flyRequest(mutation, { appId: appName });
      logger.info('[FlyNativePreview] App destroyed', { appName });
      return true;
    } catch (error) {
      logger.warn('[FlyNativePreview] Could not destroy app', { appName, error: error.message });
      // Don't fail if destruction fails
      return false;
    }
  }

  /**
   * Get preview app status
   */
  async getPreviewStatus(appName) {
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
              processGroup
            }
          }
        }
      }
    `;

    try {
      const result = await this.flyRequest(query, { name: appName });

      if (result?.app) {
        const app = result.app;
        const machine = app.machines?.nodes?.[0];

        return {
          appName,
          status: app.status,
          deployed: machine?.state === 'started',
          machineState: machine?.state,
          machineRegion: machine?.region,
          previewUrl: `https://${appName}.fly.dev`,
        };
      }

      throw new Error('App not found');
    } catch (error) {
      logger.error('[FlyNativePreview] Failed to get status', { appName, error: error.message });
      throw error;
    }
  }
}

// Export singleton
export const flyNativePreview = new FlyNativePreviewService();
export default flyNativePreview;
