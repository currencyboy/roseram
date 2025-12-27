import { logger } from './errors';

const COMMON_DEPENDENCIES = {
  react: { name: 'react', version: '^18.0.0', category: 'framework' },
  'react-dom': { name: 'react-dom', version: '^18.0.0', category: 'framework' },
  vue: { name: 'vue', version: '^3.0.0', category: 'framework' },
  angular: { name: '@angular/core', version: '^17.0.0', category: 'framework' },
  'next.js': { name: 'next', version: '^14.0.0', category: 'framework' },
  nuxt: { name: 'nuxt', version: '^3.0.0', category: 'framework' },
  tailwindcss: { name: 'tailwindcss', version: '^3.0.0', category: 'styling' },
  'material-ui': { name: '@mui/material', version: '^5.0.0', category: 'ui-library' },
  'bootstrap': { name: 'bootstrap', version: '^5.0.0', category: 'ui-library' },
  axios: { name: 'axios', version: '^1.0.0', category: 'http-client' },
  lodash: { name: 'lodash', version: '^4.0.0', category: 'utility' },
  moment: { name: 'moment', version: '^2.0.0', category: 'date-handling' },
  'date-fns': { name: 'date-fns', version: '^2.0.0', category: 'date-handling' },
  typescript: { name: 'typescript', version: '^5.0.0', category: 'language' },
  webpack: { name: 'webpack', version: '^5.0.0', category: 'bundler' },
  vite: { name: 'vite', version: '^5.0.0', category: 'bundler' },
  express: { name: 'express', version: '^4.0.0', category: 'backend' },
  fastify: { name: 'fastify', version: '^4.0.0', category: 'backend' },
  postgresql: { name: 'pg', version: '^8.0.0', category: 'database' },
  mongodb: { name: 'mongodb', version: '^6.0.0', category: 'database' },
  graphql: { name: 'graphql', version: '^16.0.0', category: 'api' },
  apollo: { name: '@apollo/client', version: '^3.0.0', category: 'api' },
};

const FRAMEWORK_PATTERNS = {
  react: [
    /import.*from\s+['"]react/,
    /from\s+['"]react['"\)]/,
    /React\.createElement/,
  ],
  vue: [
    /import.*from\s+['"]vue/,
    /<template>/,
    /Vue\.createApp/,
  ],
  angular: [
    /import.*from\s+['"]@angular/,
    /@Component/,
    /NgModule/,
  ],
  svelte: [
    /<script>/,
    /export\s+let\s+\w+\s*[:=]/,
  ],
  typescript: [
    /:\s*(?:string|number|boolean|any|void|never|unknown|Type)/,
    /interface\s+\w+/,
    /type\s+\w+\s*=/,
  ],
};

export function detectFrameworks(codebaseContent) {
  const frameworks = new Set();

  for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(codebaseContent)) {
        frameworks.add(framework);
        break;
      }
    }
  }

  return Array.from(frameworks);
}

export function detectDependencies(codebaseContent) {
  const detected = new Set();

  // Check import statements
  const importPattern = /import\s+(?:{[^}]*}|[\w\s,]+)\s+from\s+['"](@?[\w\-\.]+)/g;
  const requirePattern = /require\(['"]([@\w\-\.]+)['"]\)/g;

  let match;

  while ((match = importPattern.exec(codebaseContent)) !== null) {
    const packageName = match[2];
    if (COMMON_DEPENDENCIES[packageName]) {
      detected.add(packageName);
    }
  }

  while ((match = requirePattern.exec(codebaseContent)) !== null) {
    const packageName = match[1];
    if (COMMON_DEPENDENCIES[packageName]) {
      detected.add(packageName);
    }
  }

  // Check for specific package.json indicators
  if (/react|ReactDOM|React\.createElement/i.test(codebaseContent)) {
    detected.add('react');
    detected.add('react-dom');
  }

  if (/tailwind|@tailwind/i.test(codebaseContent)) {
    detected.add('tailwindcss');
  }

  if (/@angular|NgModule|@Component/i.test(codebaseContent)) {
    detected.add('angular');
  }

  if (/from\s+['"]vue['"]|Vue\./i.test(codebaseContent)) {
    detected.add('vue');
  }

  return Array.from(detected).map(pkg => ({
    name: COMMON_DEPENDENCIES[pkg].name,
    version: COMMON_DEPENDENCIES[pkg].version,
    category: COMMON_DEPENDENCIES[pkg].category,
  }));
}

export function analyzePackageJson(packageJsonContent) {
  try {
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = [];

    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependencies.push({
          name,
          version,
          type: 'dependency',
          category: categorizePackage(name),
        });
      }
    }

    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        dependencies.push({
          name,
          version,
          type: 'dev-dependency',
          category: categorizePackage(name),
        });
      }
    }

    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      scripts: packageJson.scripts || {},
      dependencies,
    };
  } catch (error) {
    logger.error('Failed to parse package.json', error);
    return null;
  }
}

export function generatePackageJson(projectName, dependencies, scripts = {}) {
  const defaultScripts = {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
    lint: 'next lint',
    ...scripts,
  };

  const depObj = {};
  const devDepObj = {};

  for (const dep of dependencies) {
    if (dep.type === 'dev-dependency') {
      devDepObj[dep.name] = dep.version;
    } else {
      depObj[dep.name] = dep.version;
    }
  }

  return JSON.stringify(
    {
      name: projectName || 'my-app',
      version: '1.0.0',
      description: 'Project created with RoseRam Builder',
      scripts: defaultScripts,
      dependencies: depObj,
      devDependencies: devDepObj,
    },
    null,
    2
  );
}

function categorizePackage(name) {
  if (name.includes('react') || name.includes('vue') || name.includes('angular')) return 'framework';
  if (name.includes('test') || name.includes('jest') || name.includes('mocha')) return 'testing';
  if (name.includes('webpack') || name.includes('vite') || name.includes('rollup')) return 'bundler';
  if (name.includes('tailwind') || name.includes('sass') || name.includes('css')) return 'styling';
  if (name.includes('express') || name.includes('fastify') || name.includes('hapi')) return 'backend';
  if (name.includes('axios') || name.includes('fetch') || name.includes('request')) return 'http-client';
  if (name.includes('db') || name.includes('sql') || name.includes('mongo') || name.includes('postgres')) return 'database';
  if (name.includes('eslint') || name.includes('prettier')) return 'linting';
  return 'utility';
}

export function suggestMissingDependencies(frameworks, detectedDeps) {
  const suggested = [];

  for (const framework of frameworks) {
    switch (framework) {
      case 'react':
        if (!detectedDeps.find(d => d.name === 'react')) {
          suggested.push({
            name: 'react',
            version: '^18.0.0',
            category: 'framework',
            reason: 'React framework detected in code',
          });
        }
        if (!detectedDeps.find(d => d.name === 'react-dom')) {
          suggested.push({
            name: 'react-dom',
            version: '^18.0.0',
            category: 'framework',
            reason: 'React DOM required for React',
          });
        }
        break;

      case 'typescript':
        if (!detectedDeps.find(d => d.name === 'typescript')) {
          suggested.push({
            name: 'typescript',
            version: '^5.0.0',
            category: 'language',
            reason: 'TypeScript detected in code',
          });
        }
        break;

      case 'vue':
        if (!detectedDeps.find(d => d.name === 'vue')) {
          suggested.push({
            name: 'vue',
            version: '^3.0.0',
            category: 'framework',
            reason: 'Vue framework detected in code',
          });
        }
        break;
    }
  }

  return suggested;
}
