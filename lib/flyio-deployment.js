/**
 * Fly.io Deployment - Real VM provisioning and deployment
 * Uses Fly.io GraphQL API to create and deploy applications
 */

import { logger } from './errors.js';

const FLY_IO_TOKEN = process.env.NEXT_FLY_IO_TOKEN || process.env.FLY_IO_TOKEN;
const FLY_API_URL = 'https://api.fly.io/graphql';

class FlyIODeployer {
  constructor(token) {
    if (!token) {
      throw new Error('Fly.io token not configured');
    }
    this.token = token;
  }

  async request(query, variables = {}) {
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
          .join('; ');
        throw new Error(`Fly.io error: ${errorMessage}`);
      }

      return data.data;
    } catch (error) {
      logger.error('Fly.io API request failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new Fly.io app
   */
  async createApp(appName, region = 'iad') {
    const mutation = `
      mutation CreateApp($input: CreateAppInput!) {
        createApp(input: $input) {
          app {
            id
            name
            organization {
              id
            }
            deployed
            status
          }
        }
      }
    `;

    try {
      const data = await this.request(mutation, {
        input: {
          organizationId: 'personal',
          name: appName,
          preferredRegion: region,
        },
      });

      if (data?.createApp?.app) {
        logger.info(`Created Fly.io app: ${appName}`);
        return data.createApp.app;
      }
      throw new Error('No app returned from createApp mutation');
    } catch (error) {
      // App might already exist
      logger.warn(`Could not create app ${appName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get app details
   */
  async getApp(appName) {
    const query = `
      query GetApp($appName: String!) {
        app(name: $appName) {
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
      const data = await this.request(query, { appName });
      return data?.app;
    } catch (error) {
      logger.warn(`Could not get app ${appName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set environment variables for app
   */
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

      if (data?.setSecrets?.release) {
        logger.info(`Set secrets for ${appName}`);
        return data.setSecrets.release;
      }
      throw new Error('No release returned from setSecrets mutation');
    } catch (error) {
      logger.error(`Failed to set secrets for ${appName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Allocate an IPv4 address for the app
   */
  async allocateIPv4(appName) {
    const mutation = `
      mutation AllocateIPAddress($appId: ID!) {
        allocateIpAddress(input: { appId: $appId, type: v4 }) {
          ipAddress {
            id
            address
            type
          }
        }
      }
    `;

    try {
      const app = await this.getApp(appName);
      if (!app) throw new Error('App not found');

      const data = await this.request(mutation, {
        appId: app.id,
      });

      if (data?.allocateIpAddress?.ipAddress) {
        logger.info(`Allocated IPv4 for ${appName}`);
        return data.allocateIpAddress.ipAddress;
      }
    } catch (error) {
      // IPv4 might already be allocated
      logger.warn(`Could not allocate IPv4 for ${appName}: ${error.message}`);
    }
  }

  /**
   * Create a machine using Machines API
   */
  async createMachine(appName, machineConfig) {
    try {
      const app = await this.getApp(appName);
      if (!app) {
        throw new Error(`App ${appName} not found`);
      }

      const response = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(machineConfig),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create machine: ${JSON.stringify(error)}`);
      }

      const machine = await response.json();
      logger.info(`Created machine ${machine.id} for app ${appName}`);
      return machine;
    } catch (error) {
      logger.error(`Failed to create machine for ${appName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start a machine
   */
  async startMachine(appName, machineId) {
    try {
      const response = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines/${machineId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to start machine: ${JSON.stringify(error)}`);
      }

      logger.info(`Started machine ${machineId} for app ${appName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to start machine ${machineId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get machine status
   */
  async getMachine(appName, machineId) {
    try {
      const response = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines/${machineId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get machine status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Failed to get machine ${machineId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deploy from a git repository using the preview contract system
   * Creates a long-running dev server on a Fly machine
   */
  async deployFromGit(appName, gitRepo, gitBranch, contract, envVars = {}) {
    try {
      // Parse GitHub URL to owner/repo format
      let repoPath = gitRepo;
      if (gitRepo.includes('github.com')) {
        // Convert https://github.com/owner/repo.git to owner/repo
        const match = gitRepo.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
        if (match) {
          repoPath = `${match[1]}/${match[2]}`;
        }
      }

      // Validate contract
      if (!contract || !contract.type || !contract.dev) {
        throw new Error('Valid preview contract is required (must have type, dev, port, install)');
      }

      // First, ensure app exists
      let app = await this.getApp(appName);
      if (!app) {
        app = await this.createApp(appName);
        if (!app) {
          throw new Error(`Could not create app ${appName}`);
        }
      }

      logger.info(`Deploying ${appName} from ${repoPath}:${gitBranch}`, {
        contractType: contract.type,
        port: contract.port,
        devCommand: contract.dev
      });

      // Set environment variables as secrets
      const secrets = {
        ...envVars,
        ...contract.env,
        PORT: String(contract.port),
        GITHUB_REPO: repoPath,
        BRANCH: gitBranch,
      };

      if (Object.keys(secrets).length > 0) {
        try {
          await this.setSecrets(appName, secrets);
        } catch (error) {
          logger.warn(`Could not set secrets: ${error.message}`);
        }
      }

      // Try to allocate IPv4
      try {
        await this.allocateIPv4(appName);
      } catch (error) {
        logger.warn(`Could not allocate IPv4: ${error.message}`);
      }

      // Import FlyPreviewDeployer to generate proper boot script
      const { FlyPreviewDeployer } = await import('./fly-preview-deployer.js');

      // Generate boot script from contract
      const bootScript = FlyPreviewDeployer.generateBootScript(repoPath, gitBranch, contract);

      // Get appropriate base image for the project type
      const baseImage = FlyPreviewDeployer.getBaseImage(contract.type);

      logger.info('Generated boot script for machine', {
        baseImage,
        containerSize: '1GB RAM, shared CPU'
      });

      // Create machine with proper boot script
      // The machine will be a long-running dev environment
      const machineConfig = {
        config: {
          image: baseImage,
          env: {
            PORT: String(contract.port),
            ...secrets,
          },
          // Script to clone repo, setup, and run dev server
          cmd: [
            '/bin/bash',
            '-c',
            bootScript
          ],
          services: [
            {
              protocol: 'tcp',
              internal_port: contract.port, // Use contract port for the actual service
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
          // Ensure proper process management
          restart: {
            policy: 'on-failure',
            max_retries: 3,
          },
        },
        // Machine size for dev environment
        resources: {
          memory_mb: 1024,
          cpu_units: 256,
        },
      };

      // Try to create and start the machine
      try {
        const machine = await this.createMachine(appName, machineConfig);
        await this.startMachine(appName, machine.id);

        return {
          appName,
          appId: app.id,
          machineId: machine.id,
          status: 'building',
          previewUrl: `https://${appName}.fly.dev`,
          gitRepo,
          gitBranch,
          createdAt: new Date().toISOString(),
        };
      } catch (machineError) {
        logger.warn(`Could not create machine, but app record exists: ${machineError.message}`);
        // Still return success with app record - machine might be created via other means
        return {
          appName,
          appId: app.id,
          status: 'pending',
          previewUrl: `https://${appName}.fly.dev`,
          gitRepo,
          gitBranch,
          createdAt: new Date().toISOString(),
          machineError: machineError.message,
        };
      }
    } catch (error) {
      logger.error(`Deployment failed for ${appName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check deployment status
   */
  async getDeploymentStatus(appName) {
    try {
      const app = await this.getApp(appName);
      if (!app) {
        return {
          status: 'not_found',
          appName,
        };
      }

      const machine = app.machines?.nodes?.[0];

      // Determine status based on machine state
      let status = 'pending';
      if (machine?.state === 'started') {
        status = 'running';
      } else if (machine?.state === 'destroyed' || machine?.state === 'halted') {
        status = 'error';
      } else if (machine?.state === 'starting') {
        status = 'initializing';
      }

      return {
        appName,
        status,
        appStatus: app.status,
        deployed: machine?.state === 'started',
        machineState: machine?.state,
        machineId: machine?.id,
        machineRegion: machine?.region,
        machineCreatedAt: machine?.createdAt,
        previewUrl: `https://${appName}.fly.dev`,
      };
    } catch (error) {
      logger.error(`Could not get status for ${appName}: ${error.message}`);
      return {
        status: 'error',
        appName,
        error: error.message,
      };
    }
  }

  /**
   * Destroy an app
   */
  async destroyApp(appName) {
    const mutation = `
      mutation DeleteApp($appId: ID!) {
        deleteApp(input: { appId: $appId }) {
          deletedAppId
        }
      }
    `;

    try {
      const app = await this.getApp(appName);
      if (!app) {
        throw new Error('App not found');
      }

      const data = await this.request(mutation, { appId: app.id });

      if (data?.deleteApp?.deletedAppId) {
        logger.info(`Destroyed app ${appName}`);
        return true;
      }
    } catch (error) {
      logger.error(`Could not destroy app ${appName}: ${error.message}`);
      throw error;
    }
  }
}

// Create global instance
let deployer = null;

export function getFlyIODeployer() {
  if (!deployer) {
    deployer = new FlyIODeployer(FLY_IO_TOKEN);
  }
  return deployer;
}

export function isFlyIOConfigured() {
  return !!FLY_IO_TOKEN;
}

export async function deployToFlyIO(appName, gitRepo, gitBranch, contract, envVars = {}) {
  if (!isFlyIOConfigured()) {
    throw new Error('Fly.io is not configured');
  }

  if (!contract || !contract.type || !contract.dev) {
    throw new Error('Preview contract is required and must have type, dev, port, and install commands');
  }

  const deployer = getFlyIODeployer();
  return deployer.deployFromGit(appName, gitRepo, gitBranch, contract, envVars);
}

export async function getDeploymentStatus(appName) {
  if (!isFlyIOConfigured()) {
    return { status: 'not_configured' };
  }

  const deployer = getFlyIODeployer();
  return deployer.getDeploymentStatus(appName);
}

export async function destroyDeployment(appName) {
  if (!isFlyIOConfigured()) {
    throw new Error('Fly.io is not configured');
  }

  const deployer = getFlyIODeployer();
  return deployer.destroyApp(appName);
}

/**
 * Get machine logs from Fly.io using the Machines API
 */
export async function getMachineLogs(appName, machineId, limit = 100) {
  if (!isFlyIOConfigured()) {
    throw new Error('Fly.io is not configured');
  }

  try {
    const deployer = getFlyIODeployer();

    // Use Machines API to get logs
    const response = await fetch(
      `https://api.machines.dev/v1/apps/${appName}/machines/${machineId}/logs?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${FLY_IO_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { logs: [], message: 'Logs not found for this machine' };
      }
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }

    const data = await response.json();
    return {
      logs: data,
      appName,
      machineId,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to get machine logs for ${appName}: ${error.message}`);
    return {
      logs: [],
      error: error.message,
      appName,
      machineId,
    };
  }
}

export default FlyIODeployer;
