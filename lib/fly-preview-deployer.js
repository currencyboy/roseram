/**
 * Fly Preview Deployer
 * 
 * Creates a Fly.io machine that:
 * 1. Clones the repository
 * 2. Reads .roseram/preview.json contract
 * 3. Installs dependencies
 * 4. Starts the dev server
 * 5. Exposes the port as a live preview
 */

import { logger } from './errors.js';
import { PreviewConfigGenerator } from './preview-config-generator.js';
import { validateContract } from './preview-contract.js';

export class FlyPreviewDeployer {
  /**
   * Generate the boot script for a Fly machine
   * 
   * This is a bash script that will be executed when the machine starts.
   * It implements the "long-running dev server" model.
   */
  static generateBootScript(repo, branch, contract) {
    // Validate contract
    validateContract(contract);

    const script = `#!/bin/bash
set -e

# Color output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "\${GREEN}[Roseram Preview] Starting dev environment\${NC}"
echo "Repository: ${repo}"
echo "Branch: ${branch}"
echo "Type: ${contract.type}"
echo "Dev Command: ${contract.dev}"
echo "Port: ${contract.port}"

# Clone the repository
echo -e "\${YELLOW}[1/5] Cloning repository...\${NC}"
git clone --depth 1 --branch "${branch}" "https://github.com/${repo}.git" /app
cd /app

# Fetch preview contract if it exists
if [ -f ".roseram/preview.json" ]; then
  echo -e "\${YELLOW}[2/5] Found preview contract (.roseram/preview.json)\${NC}"
  # Parse and use the contract from the repo
  INSTALL_CMD=\$(jq -r '.install' .roseram/preview.json)
  DEV_CMD=\$(jq -r '.dev' .roseram/preview.json)
  CONTRACT_PORT=\$(jq -r '.port' .roseram/preview.json)
  
  echo "Using contract values:"
  echo "  Install: \$INSTALL_CMD"
  echo "  Dev: \$DEV_CMD"
  echo "  Port: \$CONTRACT_PORT"
else
  echo -e "\${YELLOW}[2/5] No preview contract found, using defaults\${NC}"
  INSTALL_CMD="${contract.install}"
  DEV_CMD="${contract.dev}"
  CONTRACT_PORT="${contract.port}"
fi

# Set PORT environment variable for the dev server
# The service will listen on this port and it will be exposed via Fly.io
export PORT=\${CONTRACT_PORT:-${contract.port}}

# Ensure the dev server binds to all interfaces
export HOST=0.0.0.0

# Set other environment variables from contract
${Object.entries(contract.env || {}).map(([key, value]) => `export ${key}="${value}"`).join('\n')}

# Log environment for debugging
echo "Environment: PORT=\$PORT, HOST=\$HOST, NODE_ENV=\${NODE_ENV:-production}"

# Install dependencies
echo -e "\${YELLOW}[3/5] Installing dependencies...\${NC}"
echo "Running: \$INSTALL_CMD"
eval "\$INSTALL_CMD" || {
  echo -e "\${RED}[ERROR] Failed to install dependencies\${NC}"
  exit 1
}

# Optional: Run build if specified
${contract.build ? `
echo -e "\${YELLOW}[4/5] Building project...\${NC}"
${contract.build} || {
  echo -e "\${RED}[ERROR] Build failed\${NC}"
  exit 1
}
` : `echo -e "\${YELLOW}[4/5] Skipping build (not required)\${NC}"`}

# Start the dev server
echo -e "\${YELLOW}[5/5] Starting development server on 0.0.0.0:\$PORT\${NC}"
echo "Running: \$DEV_CMD"
echo ""
echo -e "\${GREEN}=== Dev server is running ===${NC}"
echo "Port: \$PORT"
echo "URL: https://<app-name>.fly.dev"
echo ""

# Start dev server with proper output handling
# Keep all output visible and the process running
exec bash -c "
  # Ensure output is not buffered
  export PYTHONUNBUFFERED=1
  export PYTHONDONTWRITEBYTECODE=1

  # Run the dev command with full output
  \$DEV_CMD 2>&1
" || {
  echo -e "\${RED}[ERROR] Dev server exited with code \$?\${NC}"
  # Keep the container alive so we can inspect logs
  sleep infinity
}
`;

    return script.trim();
  }

  /**
   * Generate machine configuration for Fly
   */
  static generateMachineConfig(bootScript, contract) {
    return {
      config: {
        image: this.getBaseImage(contract.type),
        env: {
          PORT: String(contract.port),
          ...contract.env
        },
        // Write the boot script and execute it
        files: [
          {
            guestPath: '/start.sh',
            rawValue: bootScript
          }
        ],
        // Run the boot script
        cmd: ['/bin/bash', '/start.sh'],
        // Keep machine running even if command exits
        restart: {
          policy: 'on-failure',
          max_retries: 3
        }
      },
      // 1GB RAM, shared CPU is fine for dev
      resources: {
        memory_mb: 1024,
        cpu_units: 256 // 0.25 vCPU
      }
    };
  }

  /**
   * Get appropriate base image for project type
   */
  static getBaseImage(type) {
    const images = {
      node: 'node:20-alpine',
      python: 'python:3.11-slim',
      ruby: 'ruby:3.2-alpine',
      go: 'golang:1.21-alpine',
      java: 'openjdk:21-slim',
      php: 'php:8.2-cli-alpine',
      rust: 'rust:latest',
      other: 'ubuntu:latest'
    };

    return images[type] || images.other;
  }

  /**
   * Create a boot script from inspection and files
   */
  static createBootScriptFromInspection(repo, branch, inspection) {
    const contract = PreviewConfigGenerator.generate(inspection);
    return this.generateBootScript(repo, branch, contract);
  }
}
