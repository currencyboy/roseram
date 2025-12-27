/**
 * Automated Preview Manager
 * Simplified flow:
 * 1. Create Sprite container
 * 2. Clone repository
 * 3. Install dependencies and run dev server
 */

import { logger } from '@/lib/errors';
import spritesService from '@/lib/sprites-service';

class AutoPreviewManager {
  constructor() {
    this.activePreviews = new Map(); // Map of projectId -> preview info
  }

  /**
   * Check for package manager lock files
   */
  async checkForLockFiles(githubAPI, owner, repo, branch) {
    const result = { pnpm: false, yarn: false, npm: false };
    const lockFiles = [
      { name: 'pnpm-lock.yaml', key: 'pnpm' },
      { name: 'yarn.lock', key: 'yarn' },
      { name: 'package-lock.json', key: 'npm' },
    ];

    for (const { name, key } of lockFiles) {
      try {
        const response = await githubAPI.rest.repos.getContent({
          owner,
          repo,
          path: name,
          ref: branch,
        });
        if (response.status === 200) {
          result[key] = true;
          logger.debug('[AutoPreviewManager] Found lock file', { file: name });
        }
      } catch (err) {
        // File doesn't exist, continue
      }
    }

    return result;
  }

  /**
   * Create an automated preview for a repository
   */
  async createPreview(githubAPI, projectId, owner, repo, branch = 'main', options = {}) {
    const {
      region = 'ord',
      ramMB = 1024,
      cpus = 1,
      timeout = 120000, // 2 minutes - reduced from 5 for faster failure and retry
    } = options;

    try {
      logger.info('[AutoPreviewManager] Starting automated preview creation', {
        projectId,
        owner,
        repo,
        branch,
      });

      // Step 5: Create Sprite
      // Generate short sprite name (max 63 chars): p-{random}-{timestamp}
      // Use only timestamp portion to keep it short
      const randomStr = Math.random().toString(36).substring(2, 8); // 6 random chars
      const timestamp = Date.now().toString().slice(-5); // Last 5 digits (max 99999)
      const spriteName = `p-${randomStr}-${timestamp}`;

      if (spriteName.length > 63) {
        throw new Error(`Sprite name too long (${spriteName.length} chars): ${spriteName}`);
      }

      logger.info('[AutoPreviewManager] Creating Sprite', {
        spriteName,
        region,
        ramMB,
        cpus,
      });

      const sprite = await spritesService.createSprite(spriteName, {
        region,
        ramMB,
        cpus,
      });

      logger.info('[AutoPreviewManager] Sprite created successfully', {
        spriteName,
        spriteId: sprite.id,
      });

      // Step 2: Extract GitHub token from Octokit instance
      // The token is stored in githubAPI.request.defaults.headers.authorization
      let githubToken = null;
      try {
        // Try to get token from the Octokit auth object
        if (githubAPI?.request?.defaults?.headers?.authorization) {
          const authHeader = githubAPI.request.defaults.headers.authorization;
          // Extract token from "Bearer token" or "token token" format
          githubToken = authHeader.replace(/^(Bearer |token )/i, '');
        }
      } catch (err) {
        logger.warn('[AutoPreviewManager] Could not extract GitHub token from Octokit', { error: err.message });
      }

      // Setup and run dev server
      const repoUrl = `https://github.com/${owner}/${repo}.git`;

      // Simple package manager detection by checking for lock files
      let packageManager = 'npm';
      try {
        const files = await this.checkForLockFiles(githubAPI, owner, repo, branch);
        if (files.pnpm) packageManager = 'pnpm';
        else if (files.yarn) packageManager = 'yarn';
      } catch (err) {
        logger.warn('[AutoPreviewManager] Could not detect package manager, using npm', { error: err.message });
      }

      logger.info('[AutoPreviewManager] Setting up and running dev server', {
        repoUrl,
        branch,
        packageManager,
        hasGithubToken: !!githubToken,
      });

      // Setup and run dev server with GitHub token for authenticated cloning
      const portInfo = await spritesService.setupAndRunDevServer(sprite, repoUrl, branch, {
        timeout,
        packageManager,
        scriptName: 'dev',
        githubToken,
      });

      logger.info('[AutoPreviewManager] Dev server started successfully', {
        port: portInfo.port,
        pid: portInfo.pid,
      });

      // Step 3: Create preview URL
      const previewUrl = `https://${spriteName}.fly.dev`;

      // Store preview info
      const previewInfo = {
        projectId,
        owner,
        repo,
        branch,
        spriteName,
        spriteId: sprite.id,
        port: portInfo.port,
        pid: portInfo.pid,
        previewUrl,
        createdAt: new Date(),
        status: 'running',
      };

      this.activePreviews.set(projectId, previewInfo);

      logger.info('[AutoPreviewManager] Preview created successfully', previewInfo);

      return previewInfo;
    } catch (error) {
      logger.error('[AutoPreviewManager] Failed to create preview', {
        projectId,
        error: error.message,
        stack: error.stack,
      });

      throw {
        error: error.message,
        projectId,
        details: error.toString(),
      };
    }
  }

  /**
   * Get existing preview
   */
  getPreview(projectId) {
    return this.activePreviews.get(projectId);
  }

  /**
   * List all active previews
   */
  listPreviews() {
    return Array.from(this.activePreviews.values());
  }

  /**
   * Destroy preview and cleanup Sprite
   */
  async destroyPreview(projectId) {
    try {
      const preview = this.activePreviews.get(projectId);
      if (!preview) {
        logger.warn('[AutoPreviewManager] Preview not found for destruction', { projectId });
        return;
      }

      logger.info('[AutoPreviewManager] Destroying preview', {
        projectId,
        spriteName: preview.spriteName,
      });

      await spritesService.destroySprite(preview.spriteName);
      this.activePreviews.delete(projectId);

      logger.info('[AutoPreviewManager] Preview destroyed', { projectId });
    } catch (error) {
      logger.error('[AutoPreviewManager] Failed to destroy preview', {
        projectId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get preview status
   */
  async getPreviewStatus(projectId) {
    const preview = this.activePreviews.get(projectId);
    if (!preview) {
      return { status: 'not_found', projectId };
    }

    return {
      projectId,
      status: preview.status,
      previewUrl: preview.previewUrl,
      spriteName: preview.spriteName,
      packageManager: preview.packageManager,
      createdAt: preview.createdAt,
      uptime: Date.now() - preview.createdAt.getTime(),
    };
  }
}

// Export singleton
const autoPreviewManager = new AutoPreviewManager();
export default autoPreviewManager;
