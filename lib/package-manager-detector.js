/**
 * Package Manager Detector
 * Analyzes repository to determine package manager and installation strategy
 */

import { logger } from '@/lib/errors';

export const PackageManagers = {
  NPM: 'npm',
  PNPM: 'pnpm',
  YARN: 'yarn',
  BUN: 'bun',
};

export const PackageManagerInfo = {
  [PackageManagers.NPM]: {
    lockFile: 'package-lock.json',
    installCmd: 'npm install',
    devCmd: 'npm run dev',
    startCmd: 'npm start',
    priority: 1,
  },
  [PackageManagers.PNPM]: {
    lockFile: 'pnpm-lock.yaml',
    installCmd: 'pnpm install',
    devCmd: 'pnpm dev',
    startCmd: 'pnpm start',
    priority: 2,
    configFiles: ['pnpm-workspace.yaml', '.pnpmrc'],
  },
  [PackageManagers.YARN]: {
    lockFile: 'yarn.lock',
    installCmd: 'yarn install',
    devCmd: 'yarn dev',
    startCmd: 'yarn start',
    priority: 3,
    configFiles: ['.yarnrc', '.yarnrc.yml'],
  },
  [PackageManagers.BUN]: {
    lockFile: 'bun.lockb',
    installCmd: 'bun install',
    devCmd: 'bun dev',
    startCmd: 'bun start',
    priority: 4,
  },
};

/**
 * Detect package manager from repository files
 */
export async function detectPackageManager(githubAPI, owner, repo, branch = 'main') {
  try {
    logger.info('[PackageManagerDetector] Detecting package manager', { owner, repo, branch });

    // Check for lockfiles in priority order
    const detectResults = await Promise.all(
      Object.entries(PackageManagers).map(async ([key, manager]) => {
        const info = PackageManagerInfo[manager];
        
        // Check main lockfile
        try {
          const response = await githubAPI.rest.repos.getContent({
            owner,
            repo,
            path: info.lockFile,
            ref: branch,
          });

          if (response.status === 200) {
            logger.info(`[PackageManagerDetector] Found ${manager} lockfile`, { lockFile: info.lockFile });
            return { manager, priority: info.priority, found: true, file: info.lockFile };
          }
        } catch (err) {
          // File not found, continue
        }

        // Check config files if available
        if (info.configFiles) {
          for (const configFile of info.configFiles) {
            try {
              const response = await githubAPI.rest.repos.getContent({
                owner,
                repo,
                path: configFile,
                ref: branch,
              });

              if (response.status === 200) {
                logger.info(`[PackageManagerDetector] Found ${manager} config file`, { configFile });
                return { manager, priority: info.priority, found: true, file: configFile };
              }
            } catch (err) {
              // File not found, continue
            }
          }
        }

        return { manager, priority: info.priority, found: false };
      })
    );

    // Return first found (by priority), or default to npm
    const found = detectResults.filter(r => r.found).sort((a, b) => a.priority - b.priority)[0];
    
    if (found) {
      logger.info(`[PackageManagerDetector] Detected: ${found.manager}`, { file: found.file });
      return {
        manager: found.manager,
        detected: true,
        detectedFrom: found.file,
        info: PackageManagerInfo[found.manager],
      };
    }

    // Default to npm
    logger.warn('[PackageManagerDetector] No lockfile found, defaulting to npm');
    return {
      manager: PackageManagers.NPM,
      detected: false,
      detectedFrom: 'default',
      info: PackageManagerInfo[PackageManagers.NPM],
    };
  } catch (error) {
    logger.error('[PackageManagerDetector] Error detecting package manager', { error: error.message });
    // Default to npm on error
    return {
      manager: PackageManagers.NPM,
      detected: false,
      detectedFrom: 'error_fallback',
      info: PackageManagerInfo[PackageManagers.NPM],
    };
  }
}

/**
 * Detect dev script from package.json
 */
export async function detectDevScript(githubAPI, owner, repo, branch = 'main') {
  try {
    logger.info('[PackageManagerDetector] Detecting dev script', { owner, repo, branch });

    const response = await githubAPI.rest.repos.getContent({
      owner,
      repo,
      path: 'package.json',
      ref: branch,
    });

    const content = Buffer.from(response.data.content, 'base64').toString('utf8');
    const packageJson = JSON.parse(content);

    if (packageJson.scripts?.dev) {
      logger.info('[PackageManagerDetector] Found custom dev script', { script: packageJson.scripts.dev });
      return {
        found: true,
        script: packageJson.scripts.dev,
        scripts: packageJson.scripts || {},
      };
    }

    if (packageJson.scripts?.start) {
      logger.info('[PackageManagerDetector] Using start script as fallback');
      return {
        found: true,
        script: packageJson.scripts.start,
        isStartScript: true,
        scripts: packageJson.scripts || {},
      };
    }

    logger.warn('[PackageManagerDetector] No dev or start script found');
    return {
      found: false,
      scripts: packageJson.scripts || {},
    };
  } catch (error) {
    logger.error('[PackageManagerDetector] Error detecting dev script', { error: error.message });
    return {
      found: false,
      scripts: {},
    };
  }
}

/**
 * Get full installation and dev commands for a package manager
 */
export function getInstallationCommands(manager) {
  const info = PackageManagerInfo[manager] || PackageManagerInfo[PackageManagers.NPM];
  return {
    install: info.installCmd,
    dev: info.devCmd,
    start: info.startCmd,
  };
}

/**
 * Build install command with optional flags
 */
export function buildInstallCommand(manager, options = {}) {
  const baseCmd = getInstallationCommands(manager).install;
  const parts = [baseCmd];

  if (options.ci) {
    // Use CI mode if available
    if (manager === PackageManagers.NPM) {
      return `${baseCmd} ci`;
    } else if (manager === PackageManagers.PNPM) {
      return `${baseCmd} --frozen-lockfile`;
    }
  }

  return baseCmd;
}

/**
 * Detect if project is a workspace (monorepo)
 */
export async function detectWorkspace(githubAPI, owner, repo, branch = 'main') {
  try {
    // Check for pnpm-workspace.yaml
    try {
      await githubAPI.rest.repos.getContent({
        owner,
        repo,
        path: 'pnpm-workspace.yaml',
        ref: branch,
      });
      return { isWorkspace: true, type: 'pnpm', file: 'pnpm-workspace.yaml' };
    } catch (err) {
      // Not found
    }

    // Check for lerna.json
    try {
      await githubAPI.rest.repos.getContent({
        owner,
        repo,
        path: 'lerna.json',
        ref: branch,
      });
      return { isWorkspace: true, type: 'lerna', file: 'lerna.json' };
    } catch (err) {
      // Not found
    }

    // Check for workspaces in root package.json
    try {
      const response = await githubAPI.rest.repos.getContent({
        owner,
        repo,
        path: 'package.json',
        ref: branch,
      });
      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      const packageJson = JSON.parse(content);

      if (packageJson.workspaces) {
        return { isWorkspace: true, type: 'npm', file: 'package.json', workspaces: packageJson.workspaces };
      }
    } catch (err) {
      // Not found
    }

    return { isWorkspace: false };
  } catch (error) {
    logger.error('[PackageManagerDetector] Error detecting workspace', { error: error.message });
    return { isWorkspace: false, error: error.message };
  }
}
