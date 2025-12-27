import { SpritesClient } from '@fly/sprites';
import { logger } from '@/lib/errors';
import { PackageManagers, PackageManagerInfo, getInstallationCommands } from '@/lib/package-manager-detector';

class SpritesPreviewService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.initError = null;
    // Don't initialize on construction - do it lazily
  }

  initializeClient() {
    // Only initialize once
    if (this.initialized || this.client) {
      return this.client;
    }

    try {
      const token = process.env.SPRITES_TOKEN;
      if (!token) {
        this.initError = 'SPRITES_TOKEN environment variable is not set';
        logger.warn('[SpritesService] ' + this.initError);
        return null;
      }

      this.client = new SpritesClient(token);
      this.initialized = true;
      logger.info('[SpritesService] Initialized successfully with token');
      return this.client;
    } catch (error) {
      this.initError = error.message;
      logger.error('[SpritesService] Failed to initialize', { error: error.message });
      return null;
    }
  }

  /**
   * Check if Sprites is properly configured
   */
  isConfigured() {
    const client = this.initializeClient();
    return !!client && this.initialized;
  }

  /**
   * Create a new sprite and return a handle with retry logic
   */
  async createSprite(spriteName, config = {}, retries = 2) {
    try {
      const client = this.initializeClient();
      if (!client) {
        throw new Error(`Sprites not initialized: ${this.initError}`);
      }

      const spriteConfig = {
        ramMB: config.ramMB || 512,
        cpus: config.cpus || 1,
        region: config.region || 'ord',
        ...config,
      };

      const sprite = await client.createSprite(spriteName, spriteConfig);
      logger.info('[SpritesService] Created sprite', { spriteName, config: spriteConfig });
      return sprite;
    } catch (error) {
      logger.error('[SpritesService] Failed to create sprite', {
        spriteName,
        error: error.message,
        retries
      });

      // Retry on transient errors (WebSocket, network, etc.)
      if (retries > 0 && (
        error.message?.includes('WebSocket') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ETIMEDOUT')
      )) {
        logger.info('[SpritesService] Retrying sprite creation', { spriteName, retriesLeft: retries - 1 });
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
        return this.createSprite(spriteName, config, retries - 1);
      }

      throw new Error(`Failed to create sprite: ${error.message}`);
    }
  }

  /**
   * Get existing sprite by name
   */
  async getSprite(spriteName) {
    try {
      const client = this.initializeClient();
      if (!client) {
        throw new Error(`Sprites not initialized: ${this.initError}`);
      }

      const sprite = client.sprite(spriteName);
      return sprite;
    } catch (error) {
      logger.error('[SpritesService] Failed to get sprite', { spriteName, error: error.message });
      throw new Error(`Failed to get sprite: ${error.message}`);
    }
  }

  /**
   * Clone repository, install dependencies, and start dev server
   * Accepts config overrides from dynamic configuration
   */
  async setupAndRunDevServer(sprite, repoUrl, branch, options = {}) {
    const {
      workDir = '/workspace',
      packageManager = PackageManagers.NPM,
      scriptName = 'dev',
      timeout = 120000, // 2 minutes (reduced from 5 to fail faster and retry)
      tty = true,
      rows = 24,
      cols = 80,
      githubToken = null,
      // New config overrides from dynamic configuration
      portDetectionPatterns = null,
      portDetectionTimeout = null,
    } = options;

    // Use provided patterns and timeout if available
    const finalTimeout = portDetectionTimeout || timeout;
    const patterns = portDetectionPatterns || null;

    return this._runSetupSequenceWithPortDetection(
      sprite,
      repoUrl,
      branch,
      workDir,
      scriptName,
      packageManager,
      finalTimeout,
      githubToken,
      patterns
    );
  }

  /**
   * Internal: Run setup sequence with port detection
   * Uses dynamic port detection patterns from configuration if provided
   */
  async _runSetupSequenceWithPortDetection(sprite, repoUrl, branch, workDir, scriptName, packageManager = PackageManagers.NPM, timeout = 120000, githubToken = null, customPatterns = null) {
    return new Promise((resolve, reject) => {
      let portFound = false;
      const startTime = Date.now();
      const timeoutMs = timeout;

      const timeoutId = setTimeout(() => {
        if (!portFound) {
          const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
          logger.warn('[SpritesService] Port detection timeout', {
            packageManager,
            timeoutSeconds: timeoutMs / 1000,
            elapsedSeconds,
            message: 'Dev server did not open a port within timeout. Check repository setup and dependencies.'
          });
          reject(new Error(`Dev server did not open a port within ${timeoutMs / 1000}s. Verify the repository has correct dependencies and the dev server starts properly.`));
        }
      }, timeoutMs);

      const pmInfo = PackageManagerInfo[packageManager] || PackageManagerInfo[PackageManagers.NPM];

      // Build install command based on package manager
      let installCmd = pmInfo.installCmd;
      let devCmd = pmInfo.devCmd;

      // Try custom script first, then fallback to dev/start
      const runCmd = `${packageManager} run ${scriptName} 2>&1 || ${devCmd} 2>&1 || ${pmInfo.startCmd}`;

      // Build authenticated repository URL if token is provided
      let authenticatedRepoUrl = repoUrl;
      let gitConfigCmd = '';
      if (githubToken) {
        // For private repositories, configure git with the token
        // Using git config approach is safer than embedding token in URL
        gitConfigCmd = `git config --global url."https://${githubToken}@github.com/".insteadOf "https://github.com/" && `;
        logger.info('[SpritesService] Using authenticated GitHub token for cloning');
      }

      const commands = [
        `mkdir -p ${workDir} && cd ${workDir}`,
        `${gitConfigCmd}git clone --branch ${branch} ${authenticatedRepoUrl} repo 2>&1 || git clone ${authenticatedRepoUrl} repo`,
        `cd repo`,
        `test -f package.json && ${installCmd}`,
        runCmd,
      ];

      const fullCommand = commands.join(' && ');
      logger.info('[SpritesService] Running setup sequence', {
        command: fullCommand,
        packageManager,
        installCmd,
        devCmd,
        scriptName,
      });

      const cmd = sprite.spawn('sh', ['-c', fullCommand], {
        cwd: workDir,
        tty: true,
        rows: 24,
        cols: 80,
      });

      let outputBuffer = '';
      let detectedPort = 3000; // Default port
      let pid = process.pid;
      let hasErrors = false;
      let errorOutput = '';

      // Stream logs and detect port opening
      cmd.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        outputBuffer += data;

        logger.debug('[SpritesService] stdout', {
          data: data.slice(0, 200),
          packageManager,
        });
        console.log('[Sprites Preview]', data);

        // Detect errors in output
        if (!hasErrors && (data.includes('Error') || data.includes('error') || data.includes('ERR!') || data.includes('fatal'))) {
          hasErrors = true;
          errorOutput = data;
          logger.warn('[SpritesService] Error detected in dev server output', {
            packageManager,
            error: data.slice(0, 500)
          });
        }

        // Detect port from common patterns in dev server output
        if (!portFound) {
          // Use custom patterns if provided, otherwise use defaults
          let portPatterns = [];

          if (customPatterns && Array.isArray(customPatterns) && customPatterns.length > 0) {
            try {
              // Convert string patterns to RegExp if needed
              portPatterns = customPatterns.map(pattern => {
                if (typeof pattern === 'string') {
                  return new RegExp(pattern, 'i');
                }
                return pattern;
              });
              logger.info('[SpritesService] Using custom port detection patterns', { patternCount: portPatterns.length });
            } catch (err) {
              logger.warn('[SpritesService] Failed to parse custom patterns, using defaults', { error: err.message });
              portPatterns = [
                /(?:listening|listening on|Local:.*?:)(\d{4,5})/i,
                /http:\/\/localhost:(\d{4,5})/i,
                /Port (\d{4,5})/i,
                /:(\d{4,5})\//i,
                /\*\*\*\s*(\d{4,5})\s*\*\*\*/,
                /http.*?(\d{4,5})/i,
              ];
            }
          } else {
            // Default patterns
            portPatterns = [
              /(?:listening|listening on|Local:.*?:)(\d{4,5})/i,
              /http:\/\/localhost:(\d{4,5})/i,
              /Port (\d{4,5})/i,
              /:(\d{4,5})\//i,
              /\*\*\*\s*(\d{4,5})\s*\*\*\*/,  // ** 3000 ** format
              /http.*?(\d{4,5})/i,  // Generic http pattern
            ];
          }

          for (const pattern of portPatterns) {
            const match = data.match(pattern);
            if (match && match[1]) {
              detectedPort = parseInt(match[1], 10);
              portFound = true;
              logger.info('[SpritesService] Port detected from output', { port: detectedPort, packageManager });
              clearTimeout(timeoutId);
              resolve({ port: detectedPort, pid, packageManager });
              return;
            }
          }
        }
      });

      cmd.stderr.on('data', (chunk) => {
        const data = chunk.toString();
        outputBuffer += data;

        logger.debug('[SpritesService] stderr', {
          data: data.slice(0, 200),
          packageManager,
        });
        console.error('[Sprites Preview Error]', data);

        // Capture error output for better error messages
        if (!hasErrors && data.length > 0) {
          hasErrors = true;
          errorOutput = data;
          logger.warn('[SpritesService] Error in stderr', {
            packageManager,
            error: data.slice(0, 500)
          });
        }
      });

      // Handle potential errors - use try/catch in case cmd doesn't have error event
      try {
        if (cmd && typeof cmd.on === 'function') {
          cmd.on('error', (error) => {
            if (portFound) return; // Port already detected, ignore errors
            clearTimeout(timeoutId);
            const errorMsg = error?.message || String(error);
            logger.error('[SpritesService] Command error', {
              error: errorMsg,
              packageManager,
              isWebSocketError: errorMsg.includes('WebSocket')
            });
            reject(new Error(`Failed to spawn dev server: ${errorMsg}`));
          });

          // Handle process exit
          cmd.on('exit', (code) => {
            if (portFound) return; // Port already detected, exit is normal
            clearTimeout(timeoutId);
            if (code !== null && code !== 0) {
              const message = hasErrors
                ? `Dev server exited with code ${code}. Error: ${errorOutput.slice(0, 200)}`
                : `Dev server exited with code ${code}. Check repository setup and dependencies.`;
              logger.error('[SpritesService] Dev server exited', { code, packageManager, message });
              reject(new Error(message));
            }
          });

          // Handle close event (alternative to exit)
          if (typeof cmd.on === 'function') {
            cmd.on('close', (code) => {
              if (!portFound && code !== null && code !== 0) {
                clearTimeout(timeoutId);
                logger.warn('[SpritesService] Process closed with code', { code, packageManager });
              }
            });
          }
        }
      } catch (err) {
        logger.warn('[SpritesService] Could not attach error handler', { error: err.message });
      }

      // Note: We don't wait for cmd.wait() since the dev server should stay running
      // The promise resolves once we detect the port opening
      // If port detection times out, the timeout handler will reject the promise
    });
  }

  /**
   * Get list of active sessions in sprite
   */
  async listSessions(spriteName) {
    try {
      const client = this.initializeClient();
      if (!client) {
        throw new Error(`Sprites not initialized: ${this.initError}`);
      }

      const sprite = client.sprite(spriteName);
      const sessions = await sprite.listSessions();
      return sessions;
    } catch (error) {
      logger.error('[SpritesService] Failed to list sessions', { spriteName, error: error.message });
      throw new Error(`Failed to list sessions: ${error.message}`);
    }
  }

  /**
   * Destroy sprite (cleanup)
   */
  async destroySprite(spriteName) {
    try {
      const client = this.initializeClient();
      if (!client) {
        throw new Error(`Sprites not initialized: ${this.initError}`);
      }

      const sprite = client.sprite(spriteName);
      await sprite.delete();
      logger.info('[SpritesService] Destroyed sprite', { spriteName });
    } catch (error) {
      logger.error('[SpritesService] Failed to destroy sprite', { spriteName, error: error.message });
      throw new Error(`Failed to destroy sprite: ${error.message}`);
    }
  }
}

// Export singleton
const spritesService = new SpritesPreviewService();
export default spritesService;
