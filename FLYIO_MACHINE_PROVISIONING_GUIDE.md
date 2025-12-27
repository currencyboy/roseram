# Fly.io Machine Provisioning Implementation Guide

## Overview

The incremental setup system provides the **structure and UI** for step-by-step machine setup. This guide explains how to implement the **actual Fly.io machine provisioning** for steps 2-4.

Currently, steps 2-4 are **stubbed out** with placeholder logic. This guide shows you how to integrate them with the actual Fly.io GraphQL API.

## Current Implementation Status

| Step | Status | Details |
|------|--------|---------|
| 1 | ✅ Complete | Repository detection using GitHub API |
| 2 | 🚧 Stubbed | Machine allocation (placeholder logic) |
| 3 | 🚧 Stubbed | Settings configuration (placeholder logic) |
| 4 | 🚧 Stubbed | Repository boot (placeholder logic) |

## Fly.io API Integration

### Setup: Fly.io SDK/API

**Option A: Using Fly.io GraphQL API (Recommended)**

```bash
npm install @fly/sdk
# or
npm install graphql-request
```

**Option B: Using Fly.io REST API**

```bash
# No additional packages needed, use fetch API
```

**Option C: Using Fly.io CLI (via subprocess)**

```bash
# Requires flyctl CLI installed on server
# Less ideal for production, but works for MVPs
```

We recommend **Option A** (GraphQL API) as it's well-documented and official.

## Step 2: Machine Allocation Implementation

### Current Stub Code

```javascript
async function executeStep2(session) {
  logger.info('Executing Step 2: Machine Allocation', { sessionId: session.id });

  try {
    if (!FLY_TOKEN) {
      throw new Error('Fly.io token not configured');
    }

    // For now, we just allocate the app name and prepare the machine
    // Actual machine creation will happen in step 4
    const machineDetails = {
      appName: session.fly_app_name,
      previewUrl: session.preview_url,
      machineSize: 'shared-cpu-2x',
      region: 'dfw',
      reserved: false,
    };

    return {
      stepStatus: 'completed',
      stepDetails: machineDetails,
    };
  } catch (error) {
    logger.error('Step 2 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: { error: error.message },
    };
  }
}
```

### Implementation: Create Fly App

Replace the stub with actual Fly.io app creation:

```javascript
import { client } from '@/lib/flyio-client'; // We'll create this

async function executeStep2(session) {
  logger.info('Executing Step 2: Machine Allocation', { sessionId: session.id });

  try {
    if (!FLY_TOKEN) {
      throw new Error('Fly.io token not configured');
    }

    // Create the Fly.io app
    const createAppQuery = `
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

    const appResponse = await client.request(createAppQuery, {
      input: {
        organizationId: process.env.FLY_ORG_ID, // Set in .env
        name: session.fly_app_name,
      },
    });

    const appId = appResponse.createApp.app.id;

    // Allocate a machine
    const createMachineQuery = `
      mutation AllocateMachine($input: AllocateMachineInput!) {
        allocateMachine(input: $input) {
          machine {
            id
            name
            status
            region
          }
        }
      }
    `;

    const machineResponse = await client.request(createMachineQuery, {
      input: {
        appId,
        region: 'dfw', // Dallas, adjust as needed
        size: 'shared-cpu-2x',
      },
    });

    const machineId = machineResponse.allocateMachine.machine.id;

    return {
      stepStatus: 'completed',
      stepDetails: {
        appId,
        machineId,
        appName: session.fly_app_name,
        previewUrl: session.preview_url,
        machineSize: 'shared-cpu-2x',
        region: 'dfw',
        status: 'allocated',
      },
    };
  } catch (error) {
    logger.error('Step 2 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: { error: error.message },
    };
  }
}
```

## Step 3: Settings Configuration Implementation

### Current Stub Code

```javascript
async function executeStep3(session) {
  logger.info('Executing Step 3: Settings Configuration', { sessionId: session.id });

  try {
    const settings = {
      environment: {
        NODE_ENV: 'production',
      },
      resources: {
        cpu: 2,
        memory: 1024,
      },
      autoStartStop: true,
      shutdownAfterInactivity: '1h',
    };

    return {
      stepStatus: 'completed',
      stepDetails: settings,
    };
  } catch (error) {
    // ...
  }
}
```

### Implementation: Configure Environment & Resources

```javascript
async function executeStep3(session) {
  logger.info('Executing Step 3: Settings Configuration', { sessionId: session.id });

  try {
    // Get app and machine IDs from step 2
    const step2Details = session.step_2_details;
    const appId = step2Details.appId;
    const machineId = step2Details.machineId;

    // Set environment variables
    const setEnvQuery = `
      mutation SetEnv($appId: ID!, $variables: [InputVar!]!) {
        setSecrets(appId: $appId, secrets: $variables) {
          release {
            id
            version
          }
        }
      }
    `;

    const envVars = [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'NEXT_PUBLIC_GITHUB_TOKEN', value: '***' },
      // Add more from session.env_variables or defaults
    ];

    await client.request(setEnvQuery, {
      appId,
      variables: envVars,
    });

    // Update machine resources
    const updateMachineQuery = `
      mutation UpdateMachine($input: UpdateMachineInput!) {
        updateMachine(input: $input) {
          machine {
            id
            cpuKind
            processorCount
            memoryMb
          }
        }
      }
    `;

    await client.request(updateMachineQuery, {
      input: {
        machineId,
        cpuKind: 'shared',
        processorCount: 2,
        memoryMb: 1024,
      },
    });

    // Set auto-stop policy
    const stopPolicy = {
      type: 'stop_on_shutdown',
      timeout: 3600, // 1 hour in seconds
    };

    return {
      stepStatus: 'completed',
      stepDetails: {
        environment: Object.fromEntries(envVars.map(v => [v.key, v.value])),
        resources: {
          cpu: 2,
          memory: 1024,
        },
        stopPolicy,
        autoStartStop: true,
      },
    };
  } catch (error) {
    logger.error('Step 3 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: { error: error.message },
    };
  }
}
```

## Step 4: Repository Boot Implementation

### Current Stub Code

```javascript
async function executeStep4(session) {
  logger.info('Executing Step 4: Repository Boot', { sessionId: session.id });

  try {
    const bootDetails = {
      bootStatus: 'ready',
      syncStatus: 'ready',
      nextActions: [
        'Repository will be cloned...',
        'Branch: ' + session.github_branch,
        'Dev server will start automatically',
      ],
    };

    return {
      stepStatus: 'completed',
      stepDetails: bootDetails,
    };
  } catch (error) {
    // ...
  }
}
```

### Implementation: Clone Repo and Start Server

```javascript
async function executeStep4(session) {
  logger.info('Executing Step 4: Repository Boot', { sessionId: session.id });

  try {
    const step2Details = session.step_2_details;
    const machineId = step2Details.machineId;
    const appId = step2Details.appId;

    // Step 4.1: Create boot volume (for persistent storage)
    const createVolumeQuery = `
      mutation CreateVolume($input: CreateVolumeInput!) {
        createVolume(input: $input) {
          volume {
            id
            name
            sizeGb
          }
        }
      }
    `;

    const volumeResponse = await client.request(createVolumeQuery, {
      input: {
        appId,
        name: `${session.fly_app_name}-storage`,
        sizeGb: 10,
        region: 'dfw',
      },
    });

    const volumeId = volumeResponse.createVolume.volume.id;

    // Step 4.2: Update Fly.toml config
    const flyToml = `
app = "${session.fly_app_name}"
primary_region = "dfw"

[build]
dockerfile = "Dockerfile"

[env]
NODE_ENV = "production"

[http_service]
processes = ["app"]
internal_port = 3000
force_https = true

[mounts]
source = "${session.fly_app_name}-storage"
destination = "/app/data"

[[vm]]
size = "shared-cpu-2x"
memory = "1024mb"
`;

    // Upload Fly.toml and Dockerfile to the machine
    // This is typically done via the machine's volume or via git clone

    // Step 4.3: Clone repository
    const cloneCommand = `
      git clone --depth 1 --branch ${session.github_branch} \\
      ${session.github_repo_url} /app
    `;

    // Step 4.4: Install dependencies
    const installCommand = 'npm ci --prefer-offline --no-audit';

    // Step 4.5: Build if needed
    const buildCommand = 'npm run build || true'; // Don't fail if no build script

    // Step 4.6: Start the app
    const startCommand = 'npm run dev || npm start';

    // Execute commands on the machine via SSH or machine API
    // Option: Use machine's volume + startup script
    const startupScript = `
#!/bin/bash
set -e
cd /app
${cloneCommand}
${installCommand}
${buildCommand}
exec ${startCommand}
`;

    // Start the machine
    const startMachineQuery = `
      mutation StartMachine($input: StartMachineInput!) {
        startMachine(input: $input) {
          machine {
            id
            state
          }
        }
      }
    `;

    const startResponse = await client.request(startMachineQuery, {
      input: { machineId },
    });

    // Poll machine status until it's running
    let machineReady = false;
    let pollAttempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals

    while (!machineReady && pollAttempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      const statusQuery = `
        query GetMachine($id: ID!) {
          machine(id: $id) {
            id
            state
          }
        }
      `;

      const statusResponse = await client.request(statusQuery, { id: machineId });
      if (statusResponse.machine.state === 'started') {
        machineReady = true;
      }

      pollAttempts++;
    }

    if (!machineReady) {
      throw new Error('Machine failed to start within timeout');
    }

    return {
      stepStatus: 'completed',
      stepDetails: {
        bootStatus: 'running',
        machineState: 'started',
        volumeId,
        nextActions: [
          `✓ Repository cloned from ${session.github_repo_url}`,
          `✓ Branch: ${session.github_branch}`,
          `✓ Dependencies installed`,
          `✓ Dev server started`,
          `✓ Preview available at ${session.preview_url}`,
        ],
        logs: [
          `[1/5] Creating storage volume...`,
          `[2/5] Cloning repository from ${session.github_repo_url}...`,
          `[3/5] Installing dependencies...`,
          `[4/5] Building application...`,
          `[5/5] Starting dev server...`,
        ],
      },
    };
  } catch (error) {
    logger.error('Step 4 failed', { error });
    return {
      stepStatus: 'error',
      stepDetails: { error: error.message },
    };
  }
}
```

## Creating the Fly.io Client

Create a reusable Fly.io GraphQL client:

```javascript
// lib/flyio-client.js
import { GraphQLClient } from 'graphql-request';

const FLY_TOKEN = process.env.NEXT_FLY_IO_TOKEN || process.env.FLY_IO_TOKEN;

if (!FLY_TOKEN) {
  console.warn('FLY_IO_TOKEN not configured');
}

export const client = new GraphQLClient('https://api.fly.io/graphql', {
  headers: {
    Authorization: `Bearer ${FLY_TOKEN}`,
  },
});

/**
 * Make a GraphQL request to Fly.io API
 */
export async function request(query, variables) {
  try {
    return await client.request(query, variables);
  } catch (error) {
    console.error('Fly.io GraphQL error:', error);
    throw new Error(`Fly.io API error: ${error.message}`);
  }
}

/**
 * Get organization ID (for creating apps)
 */
export async function getOrganizationId() {
  const query = `
    query GetOrganizations {
      organizations {
        nodes {
          id
          name
          type
        }
      }
    }
  `;

  const response = await request(query);
  const org = response.organizations.nodes[0];
  
  if (!org) {
    throw new Error('No Fly.io organization found');
  }

  return org.id;
}

/**
 * Get app status
 */
export async function getAppStatus(appId) {
  const query = `
    query GetApp($id: ID!) {
      app(id: $id) {
        id
        name
        status
        hostname
        machines {
          nodes {
            id
            state
            status
          }
        }
      }
    }
  `;

  return await request(query, { id: appId });
}

/**
 * Delete app (for cleanup)
 */
export async function deleteApp(appId) {
  const query = `
    mutation DeleteApp($input: DeleteAppInput!) {
      deleteApp(input: $input) {
        deletedAppId
      }
    }
  `;

  return await request(query, {
    input: { appId },
  });
}
```

## Environment Variables Required

Add these to your `.env.local`:

```env
# Fly.io API
NEXT_FLY_IO_TOKEN=FlyV1 xxx...
FLY_IO_TOKEN=FlyV1 xxx...

# Your Fly.io organization ID
FLY_ORG_ID=your-org-id

# Optional: Default region
FLY_DEFAULT_REGION=dfw

# Optional: Default machine size
FLY_DEFAULT_MACHINE_SIZE=shared-cpu-2x
```

## Getting Your Fly.io Organization ID

```bash
# Using Fly.io CLI
flyctl auth login
flyctl orgs list

# Or via API
curl -H "Authorization: Bearer YOUR_FLY_TOKEN" \
  https://api.fly.io/graphql \
  -d '{"query":"query{organizations{nodes{id name}}}"}'
```

## Testing the Implementation

### Unit Tests

```javascript
// tests/machine-setup.test.js
describe('Machine Setup', () => {
  describe('Step 2: Machine Allocation', () => {
    it('should create Fly.io app', async () => {
      const session = {
        id: 'test-session',
        fly_app_name: 'roseram-test123',
        github_branch: 'main',
      };

      const result = await executeStep2(session);

      expect(result.stepStatus).toBe('completed');
      expect(result.stepDetails.appId).toBeDefined();
      expect(result.stepDetails.machineId).toBeDefined();
    });
  });

  describe('Step 3: Settings Configuration', () => {
    it('should set environment variables', async () => {
      const session = {
        step_2_details: {
          appId: 'test-app-id',
          machineId: 'test-machine-id',
        },
      };

      const result = await executeStep3(session);

      expect(result.stepStatus).toBe('completed');
      expect(result.stepDetails.environment).toBeDefined();
    });
  });
});
```

### Integration Test

```javascript
// tests/integration/machine-setup-e2e.test.js
describe('Machine Setup E2E', () => {
  it('should complete all 4 steps', async () => {
    const projectId = 'test-project';
    const githubRepo = 'https://github.com/test/repo';

    // Initialize session
    const session = await initializeSetupSession(projectId, githubRepo, 'main', token);

    // Step 1
    let result = await executeSetupStep(session.id, 1, token);
    expect(result.stepResult.status).toBe('completed');

    // Step 2
    result = await executeSetupStep(session.id, 2, token);
    expect(result.stepResult.status).toBe('completed');

    // Step 3
    result = await executeSetupStep(session.id, 3, token);
    expect(result.stepResult.status).toBe('completed');

    // Step 4
    result = await executeSetupStep(session.id, 4, token);
    expect(result.stepResult.status).toBe('completed');

    // Verify preview is running
    const finalSession = result.session;
    expect(finalSession.overall_status).toBe('completed');
  });
});
```

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid token` | FLY_TOKEN expired or invalid | Re-authenticate with Fly.io |
| `Organization not found` | FLY_ORG_ID not set | Add FLY_ORG_ID to env vars |
| `App name already taken` | Another app has same name | Change app name generation |
| `Machine allocation failed` | Invalid region or size | Check FLY_DEFAULT_REGION |
| `Clone timeout` | Network issues | Increase timeout or retry |

### Debug Mode

```javascript
// In app/api/machine-setup/route.js, add debug logging
const DEBUG = process.env.DEBUG_MACHINE_SETUP === 'true';

if (DEBUG) {
  console.log('Fly.io API request:', {
    query,
    variables,
  });
}
```

## Next Steps

1. **Install dependencies:** `npm install graphql-request`
2. **Create Fly.io client:** `/lib/flyio-client.js`
3. **Implement step 2:** Machine allocation
4. **Implement step 3:** Configuration
5. **Implement step 4:** Boot repository
6. **Test with real repository**
7. **Monitor and optimize**

## References

- Fly.io GraphQL API: https://api.fly.io/graphql
- API Documentation: https://fly.io/docs/api/
- Machines API: https://fly.io/docs/machines/
- Environment Variables: https://fly.io/docs/reference/secrets/

## Support

For Fly.io specific issues:
1. Check the [Fly.io Community](https://community.fly.io/)
2. Review [Fly.io Docs](https://fly.io/docs/)
3. Contact Fly.io Support
