/**
 * Preview Contract System
 * 
 * Defines an explicit "runtime contract" for how to run any repository
 * in a dev environment on Fly.io.
 * 
 * Each repo should have a .roseram/preview.json file that specifies:
 * - Project type (node, python, ruby, go, etc.)
 * - Install command
 * - Dev command
 * - Port to expose
 * - Environment variables
 */

export const PREVIEW_CONTRACT_PATH = '.roseram/preview.json';

export const PREVIEW_CONTRACT_SCHEMA = {
  type: 'object',
  required: ['type', 'install', 'dev', 'port'],
  properties: {
    type: {
      type: 'string',
      enum: ['node', 'python', 'ruby', 'go', 'java', 'php', 'rust', 'other'],
      description: 'Project runtime type'
    },
    install: {
      type: 'string',
      description: 'Command to install dependencies (e.g., "npm install", "pip install -r requirements.txt")'
    },
    dev: {
      type: 'string',
      description: 'Command to start dev server (e.g., "npm run dev", "python -m uvicorn app:app")'
    },
    port: {
      type: 'number',
      minimum: 1,
      maximum: 65535,
      description: 'Port the dev server listens on'
    },
    env: {
      type: 'object',
      description: 'Environment variables to set (e.g., {"NODE_ENV": "development"})',
      additionalProperties: {
        type: 'string'
      }
    },
    build: {
      type: 'string',
      description: 'Optional build command if required before dev (e.g., "npm run build")'
    },
    setupScript: {
      type: 'string',
      description: 'Optional bash script to run after install but before dev (e.g., database migrations)'
    }
  }
};

/**
 * Validate a preview contract
 */
export function validateContract(contract) {
  if (!contract) {
    throw new Error('Preview contract is required');
  }

  if (!contract.type) {
    throw new Error('Preview contract must specify "type"');
  }

  if (!['node', 'python', 'ruby', 'go', 'java', 'php', 'rust', 'other'].includes(contract.type)) {
    throw new Error(`Invalid type "${contract.type}". Must be one of: node, python, ruby, go, java, php, rust, other`);
  }

  if (!contract.install || typeof contract.install !== 'string') {
    throw new Error('Preview contract must specify "install" command (string)');
  }

  if (!contract.dev || typeof contract.dev !== 'string') {
    throw new Error('Preview contract must specify "dev" command (string)');
  }

  if (!contract.port || typeof contract.port !== 'number' || contract.port < 1 || contract.port > 65535) {
    throw new Error('Preview contract must specify "port" (number between 1-65535)');
  }

  return true;
}

/**
 * Create a default contract
 */
export function createDefaultContract(type, options = {}) {
  const defaults = {
    node: {
      type: 'node',
      install: 'npm install --legacy-peer-deps 2>/dev/null || npm install',
      dev: 'npm run dev 2>/dev/null || npm start',
      port: 3000,
      env: { NODE_ENV: 'development' }
    },
    python: {
      type: 'python',
      install: 'pip install -r requirements.txt',
      dev: 'uvicorn app:app --host 0.0.0.0 --port 8000',
      port: 8000,
      env: { PYTHONUNBUFFERED: '1' }
    },
    ruby: {
      type: 'ruby',
      install: 'bundle install',
      dev: 'rails server -b 0.0.0.0 -p 3000',
      port: 3000,
      env: { RAILS_ENV: 'development' }
    },
    go: {
      type: 'go',
      install: 'go mod download',
      dev: 'go run main.go',
      port: 8080,
      env: {}
    },
    php: {
      type: 'php',
      install: 'composer install',
      dev: 'php -S 0.0.0.0:8000',
      port: 8000,
      env: {}
    },
    other: {
      type: 'other',
      install: 'echo "Please configure install command"',
      dev: 'echo "Please configure dev command"',
      port: 8000,
      env: {}
    }
  };

  const contract = defaults[type] || defaults.other;
  return { ...contract, ...options };
}
