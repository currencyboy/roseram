/**
 * Package.json Auto-Generator
 * Creates a sensible package.json for projects that don't have one
 * based on framework and file detection
 */

import { logger } from '@/lib/errors';

/**
 * Detect framework/type from repository files and structure
 */
export async function detectFramework(githubAPI, owner, repo, branch = 'main') {
  try {
    logger.info('[PackageJsonGenerator] Detecting framework', { owner, repo, branch });

    const frameworks = [
      {
        name: 'next.js',
        files: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
        priority: 1,
      },
      {
        name: 'nuxt',
        files: ['nuxt.config.ts', 'nuxt.config.js'],
        priority: 2,
      },
      {
        name: 'vite',
        files: ['vite.config.ts', 'vite.config.js'],
        priority: 3,
      },
      {
        name: 'svelte',
        files: ['svelte.config.js'],
        priority: 4,
      },
      {
        name: 'remix',
        files: ['remix.config.js'],
        priority: 5,
      },
      {
        name: 'astro',
        files: ['astro.config.ts', 'astro.config.js', 'astro.config.mjs'],
        priority: 6,
      },
      {
        name: 'gatsby',
        files: ['gatsby-config.js', 'gatsby-config.ts'],
        priority: 7,
      },
      {
        name: 'react',
        files: ['craco.config.js', '.cracorc'],
        priority: 8,
      },
      {
        name: 'vue',
        files: ['vue.config.js'],
        priority: 9,
      },
    ];

    const detected = [];

    for (const framework of frameworks) {
      for (const file of framework.files) {
        try {
          await githubAPI.rest.repos.getContent({
            owner,
            repo,
            path: file,
            ref: branch,
          });
          logger.info('[PackageJsonGenerator] Detected framework', { framework: framework.name, file });
          detected.push({ ...framework, detectedFile: file });
          break;
        } catch (err) {
          // File not found, continue
        }
      }
      if (detected.length > 0) break;
    }

    if (detected.length > 0) {
      return detected[0];
    }

    // Check for common directories
    try {
      await githubAPI.rest.repos.getContent({
        owner,
        repo,
        path: 'src',
        ref: branch,
      });
      logger.info('[PackageJsonGenerator] Found src directory, assuming generic Node.js project');
      return { name: 'generic-node', priority: 100 };
    } catch (err) {
      // No src directory
    }

    logger.warn('[PackageJsonGenerator] Could not detect framework, using generic Node.js');
    return { name: 'generic-node', priority: 100 };
  } catch (error) {
    logger.error('[PackageJsonGenerator] Error detecting framework', { error: error.message });
    return { name: 'generic-node', priority: 100 };
  }
}

/**
 * Generate a sensible package.json based on framework and project type
 */
export function generatePackageJson(projectName, framework = {}, options = {}) {
  const {
    version = '1.0.0',
    description = `Generated package.json for ${projectName}`,
    packageManager = 'npm',
  } = options;

  const frameworkName = framework.name || 'generic-node';

  const baseConfig = {
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version,
    description,
    private: true,
  };

  // Framework-specific configurations
  const configs = {
    'next.js': {
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {
        next: '^14.0.0',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0',
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        eslint: '^8.0.0',
        'eslint-config-next': '^14.0.0',
      },
    },
    nuxt: {
      scripts: {
        dev: 'nuxt dev',
        build: 'nuxt build',
        start: 'node .output/server/index.mjs',
      },
      dependencies: {
        nuxt: '^3.0.0',
        vue: '^3.3.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    },
    vite: {
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        vite: '^5.0.0',
        '@vitejs/plugin-react': '^4.0.0',
        typescript: '^5.0.0',
      },
    },
    svelte: {
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        svelte: '^4.0.0',
      },
      devDependencies: {
        'svelte-vite': '^2.0.0',
        vite: '^5.0.0',
        typescript: '^5.0.0',
      },
    },
    remix: {
      scripts: {
        dev: 'remix dev',
        build: 'remix build',
        start: 'remix-serve build/index.js',
      },
      dependencies: {
        '@remix-run/node': '^2.0.0',
        '@remix-run/react': '^2.0.0',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        '@remix-run/dev': '^2.0.0',
        typescript: '^5.0.0',
      },
    },
    astro: {
      scripts: {
        dev: 'astro dev',
        build: 'astro build',
        preview: 'astro preview',
      },
      dependencies: {
        astro: '^4.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    },
    gatsby: {
      scripts: {
        dev: 'gatsby develop',
        build: 'gatsby build',
        start: 'gatsby serve',
      },
      dependencies: {
        gatsby: '^5.0.0',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    },
    react: {
      scripts: {
        dev: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '5.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    },
    vue: {
      scripts: {
        dev: 'vue-cli-service serve',
        build: 'vue-cli-service build',
      },
      dependencies: {
        vue: '^3.3.0',
      },
      devDependencies: {
        '@vue/cli-service': '^5.0.0',
        typescript: '^5.0.0',
      },
    },
    'generic-node': {
      scripts: {
        dev: 'node index.js || node src/index.js || node app.js',
        start: 'node index.js || node src/index.js || node app.js',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    },
  };

  const config = configs[frameworkName] || configs['generic-node'];

  const packageJson = {
    ...baseConfig,
    scripts: config.scripts,
  };

  if (config.dependencies) {
    packageJson.dependencies = config.dependencies;
  }

  if (config.devDependencies) {
    packageJson.devDependencies = config.devDependencies;
  }

  // Add engines hint based on package manager
  if (packageManager === 'pnpm') {
    packageJson.packageManager = 'pnpm@latest';
  } else if (packageManager === 'yarn') {
    packageJson.packageManager = 'yarn@latest';
  }

  logger.info('[PackageJsonGenerator] Generated package.json', {
    framework: frameworkName,
    scripts: Object.keys(config.scripts),
  });

  return packageJson;
}

/**
 * Create package.json in repository via GitHub API
 */
export async function createPackageJsonInRepo(githubAPI, owner, repo, branch, packageJson, options = {}) {
  try {
    const { message = 'Auto-generate package.json for preview compatibility' } = options;

    const content = JSON.stringify(packageJson, null, 2);

    logger.info('[PackageJsonGenerator] Creating package.json in repository', {
      owner,
      repo,
      branch,
    });

    const response = await githubAPI.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'package.json',
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    });

    logger.info('[PackageJsonGenerator] Successfully created package.json', {
      sha: response.data.commit.sha,
    });

    return {
      success: true,
      sha: response.data.commit.sha,
      path: 'package.json',
    };
  } catch (error) {
    logger.error('[PackageJsonGenerator] Failed to create package.json', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check if package.json exists in repository
 */
export async function hasPackageJson(githubAPI, owner, repo, branch = 'main') {
  try {
    await githubAPI.rest.repos.getContent({
      owner,
      repo,
      path: 'package.json',
      ref: branch,
    });
    return true;
  } catch (error) {
    return false;
  }
}
