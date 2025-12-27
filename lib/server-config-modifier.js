/**
 * Server Config Modifier
 * 
 * Ensures that a repository's dev server will:
 * 1. Listen on PORT environment variable (not hardcoded port)
 * 2. Bind to 0.0.0.0 (accessible externally)
 * 3. Work correctly in Fly.io environment
 */

import { logger } from './errors.js';

export class ServerConfigModifier {
  /**
   * Generate patches needed for a Node.js project
   */
  static generateNodePatches(contract, files = []) {
    const patches = [];

    // Check if package.json needs PORT configuration
    // This is complex because we'd need to parse package.json and modify scripts
    // For now, we recommend specific dev commands that work with PORT

    const portCompatibleDevCommands = [
      'next dev',
      'vite',
      'npm run dev',
      'npm start'
    ];

    const isPortCompatible = portCompatibleDevCommands.some(cmd => contract.dev?.includes(cmd));

    if (!isPortCompatible && contract.type === 'node') {
      logger.warn('Dev command may not respect PORT environment variable', {
        command: contract.dev
      });

      patches.push({
        file: 'package.json',
        type: 'warning',
        message: 'Dev command may need modification to support PORT environment variable',
        suggestion: 'Ensure your server listens on process.env.PORT'
      });
    }

    // For Express/Fastify/Koa apps, recommend binding to 0.0.0.0
    patches.push({
      file: 'src/server.js or similar',
      type: 'info',
      message: 'Ensure server binds to 0.0.0.0 and uses PORT env var',
      code: {
        express: `app.listen(process.env.PORT || 3000, '0.0.0.0')`,
        fastify: `await app.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })`,
        koa: `app.listen(process.env.PORT || 3000, '0.0.0.0')`
      }
    });

    // For Next.js, recommend standalone output
    patches.push({
      file: 'next.config.js',
      type: 'info',
      message: 'For better Fly.io compatibility, use output: standalone',
      code: `module.exports = { output: 'standalone' }`
    });

    return patches;
  }

  /**
   * Generate patches needed for a Python project
   */
  static generatePythonPatches(contract) {
    const patches = [];

    const portCompatibleCommands = [
      'uvicorn',
      'flask',
      'gunicorn',
      'python -m'
    ];

    const isPortCompatible = portCompatibleCommands.some(cmd => contract.dev?.includes(cmd));

    if (!isPortCompatible) {
      logger.warn('Python dev command may not respect PORT environment variable', {
        command: contract.dev
      });

      patches.push({
        type: 'warning',
        message: 'Python server needs to bind to 0.0.0.0 and use PORT env var',
        suggestion: 'Use uvicorn with: uvicorn app:app --host 0.0.0.0 --port $PORT'
      });
    }

    // Recommend using PORT environment variable
    patches.push({
      type: 'info',
      message: 'Python app should read PORT from environment',
      code: {
        fastapi: `import os\nport = int(os.environ.get('PORT', 8000))\nuvicorn.run(app, host='0.0.0.0', port=port)`,
        flask: `import os\nport = int(os.environ.get('PORT', 8000))\napp.run(host='0.0.0.0', port=port)`
      }
    });

    return patches;
  }

  /**
   * Generate patches needed for a Ruby project
   */
  static generateRubyPatches(contract) {
    const patches = [];

    patches.push({
      type: 'info',
      message: 'Rails server command should bind to 0.0.0.0 and use PORT',
      code: `rails server -b 0.0.0.0 -p $PORT`
    });

    patches.push({
      type: 'info',
      message: 'Ensure Puma config allows binding to 0.0.0.0',
      file: 'config/puma.rb',
      code: `bind "tcp://0.0.0.0:#{ENV['PORT'] || 3000}"`
    });

    return patches;
  }

  /**
   * Get all patches for a contract
   */
  static getPatchesForContract(contract, files = []) {
    const patchGenerators = {
      node: (c) => this.generateNodePatches(c, files),
      python: (c) => this.generatePythonPatches(c),
      ruby: (c) => this.generateRubyPatches(c)
    };

    const generator = patchGenerators[contract.type];
    if (!generator) {
      logger.info('No automatic patches available for type', { type: contract.type });
      return [];
    }

    return generator(contract);
  }

  /**
   * Generate a setup script that ensures PORT + 0.0.0.0 compliance
   */
  static generateEnvironmentSetupScript(contract) {
    const script = `
# Ensure PORT is set
export PORT=\${PORT:-${contract.port}}

# Ensure we can bind to 0.0.0.0
export BIND_ADDR="0.0.0.0"

# Log the configuration
echo "Starting dev server on $BIND_ADDR:$PORT"
echo "Dev command: ${contract.dev}"

# Additional environment variables from contract
${Object.entries(contract.env || {}).map(([key, value]) => `export ${key}="${value}"`).join('\n')}
    `.trim();

    return script;
  }
}
