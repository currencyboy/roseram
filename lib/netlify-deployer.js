/**
 * Netlify Deployer
 * Handles deployment to Netlify for self-hosted customers
 * Compatible with various frameworks and package managers
 */

import { logger } from '@/lib/errors';

export class NetlifyDeployer {
  constructor(accessToken, siteId) {
    this.accessToken = accessToken;
    this.siteId = siteId;
    this.baseUrl = 'https://api.netlify.com/api/v1';
  }

  /**
   * Get site information
   */
  async getSiteInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${this.siteId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get site info: ${response.statusText}`);
      }

      const site = await response.json();
      logger.info('[NetlifyDeployer] Got site info', { siteId: this.siteId, name: site.name });
      return site;
    } catch (error) {
      logger.error('[NetlifyDeployer] Failed to get site info', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a deployment from Git
   */
  async deployFromGit(repo, branch = 'main') {
    try {
      logger.info('[NetlifyDeployer] Creating deployment from Git', {
        siteId: this.siteId,
        repo,
        branch,
      });

      const response = await fetch(`${this.baseUrl}/sites/${this.siteId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: {
            repo,
            branch,
            provider: 'github',
          },
          build_settings: {
            install_command: '', // Netlify will auto-detect
            base_directory: '',
            functions_directory: 'netlify/functions',
            publish_directory: 'out', // Will be overridden by build settings
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update site: ${response.statusText}`);
      }

      const site = await response.json();
      logger.info('[NetlifyDeployer] Deployment configured', {
        siteId: this.siteId,
        deployUrl: site.url,
      });

      return site;
    } catch (error) {
      logger.error('[NetlifyDeployer] Failed to configure deployment', { error: error.message });
      throw error;
    }
  }

  /**
   * Trigger a manual deploy
   */
  async triggerDeploy() {
    try {
      logger.info('[NetlifyDeployer] Triggering manual deploy', { siteId: this.siteId });

      const response = await fetch(`${this.baseUrl}/sites/${this.siteId}/builds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger deploy: ${response.statusText}`);
      }

      const build = await response.json();
      logger.info('[NetlifyDeployer] Deploy triggered', { buildId: build.id });
      return build;
    } catch (error) {
      logger.error('[NetlifyDeployer] Failed to trigger deploy', { error: error.message });
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${this.siteId}/builds`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get builds: ${response.statusText}`);
      }

      const builds = await response.json();
      const latestBuild = builds[0];

      logger.info('[NetlifyDeployer] Got deployment status', {
        siteId: this.siteId,
        status: latestBuild?.status,
      });

      return {
        buildId: latestBuild?.id,
        status: latestBuild?.status,
        createdAt: latestBuild?.created_at,
        startedAt: latestBuild?.started_at,
        completedAt: latestBuild?.completed_at,
        errorMessage: latestBuild?.error_message,
        deployUrl: latestBuild?.deploy_url,
      };
    } catch (error) {
      logger.error('[NetlifyDeployer] Failed to get deployment status', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect build settings from repository
   */
  async detectBuildSettings(githubAPI, owner, repo) {
    try {
      logger.info('[NetlifyDeployer] Detecting build settings', { owner, repo });

      const buildSettings = {
        install_command: '', // Let Netlify auto-detect
        publish_directory: 'out',
        functions_directory: 'netlify/functions',
      };

      // Check for Next.js
      try {
        await githubAPI.rest.repos.getContent({
          owner,
          repo,
          path: 'next.config.js',
        });
        buildSettings.publish_directory = '.next';
        buildSettings.build_command = 'npm run build || pnpm build || yarn build';
        logger.info('[NetlifyDeployer] Detected Next.js');
      } catch (err) {
        // Not Next.js
      }

      // Check for Astro
      try {
        await githubAPI.rest.repos.getContent({
          owner,
          repo,
          path: 'astro.config.ts',
        });
        buildSettings.publish_directory = 'dist';
        buildSettings.build_command = 'npm run build || pnpm build || yarn build';
        logger.info('[NetlifyDeployer] Detected Astro');
      } catch (err) {
        // Not Astro
      }

      // Check for Nuxt
      try {
        await githubAPI.rest.repos.getContent({
          owner,
          repo,
          path: 'nuxt.config.ts',
        });
        buildSettings.publish_directory = 'dist';
        buildSettings.build_command = 'npm run build || pnpm build || yarn build';
        logger.info('[NetlifyDeployer] Detected Nuxt');
      } catch (err) {
        // Not Nuxt
      }

      // Check for Vite
      try {
        await githubAPI.rest.repos.getContent({
          owner,
          repo,
          path: 'vite.config.ts',
        });
        if (buildSettings.publish_directory === 'out') {
          buildSettings.publish_directory = 'dist';
        }
        buildSettings.build_command = 'npm run build || pnpm build || yarn build';
        logger.info('[NetlifyDeployer] Detected Vite');
      } catch (err) {
        // Not Vite
      }

      // Check for React (CRA)
      try {
        await githubAPI.rest.repos.getContent({
          owner,
          repo,
          path: '.cracorc',
        });
        buildSettings.publish_directory = 'build';
        buildSettings.build_command = 'npm run build || pnpm build || yarn build';
        logger.info('[NetlifyDeployer] Detected Create React App');
      } catch (err) {
        // Not CRA
      }

      // Check for netlify.toml for custom configuration
      try {
        const response = await githubAPI.rest.repos.getContent({
          owner,
          repo,
          path: 'netlify.toml',
        });
        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        logger.info('[NetlifyDeployer] Found netlify.toml - using custom configuration');
        // Custom netlify.toml takes precedence
        return { ...buildSettings, hasCustomConfig: true };
      } catch (err) {
        // No custom config
      }

      logger.info('[NetlifyDeployer] Build settings detected', buildSettings);
      return buildSettings;
    } catch (error) {
      logger.error('[NetlifyDeployer] Error detecting build settings', { error: error.message });
      return {
        install_command: '',
        publish_directory: 'dist',
        functions_directory: 'netlify/functions',
      };
    }
  }

  /**
   * Check if Netlify is configured
   */
  isConfigured() {
    return !!this.accessToken && !!this.siteId;
  }
}

/**
 * Create Netlify deployer instance
 */
export function createNetlifyDeployer(accessToken, siteId) {
  if (!accessToken || !siteId) {
    logger.warn('[NetlifyDeployer] Netlify is not fully configured');
    return null;
  }

  return new NetlifyDeployer(accessToken, siteId);
}

/**
 * Get Netlify deployer instance from environment or request
 */
export function getNetlifyDeployer(accessToken = process.env.NETLIFY_ACCESS_TOKEN, siteId = process.env.NETLIFY_SITE_ID) {
  if (!accessToken || !siteId) {
    logger.warn('[NetlifyDeployer] Missing Netlify credentials');
    return null;
  }

  return new NetlifyDeployer(accessToken, siteId);
}

/**
 * Check if Netlify is available
 */
export function isNetlifyConfigured() {
  return !!(process.env.NETLIFY_ACCESS_TOKEN && process.env.NETLIFY_SITE_ID);
}
