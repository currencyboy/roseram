/**
 * Detect the main entry point file for a codebase
 * Supports Next.js, React, Vue, Svelte, and static HTML
 */

export async function detectEntryPoint(files, devServerUrl = 'http://localhost:3001') {
  if (!files || files.length === 0) {
    return null;
  }

  const filePaths = Array.isArray(files) ? files.map(f => typeof f === 'string' ? f : f.path) : [];

  // Check for package.json to understand the project type
  const hasPackageJson = filePaths.includes('package.json');

  // Check for Next.js 13+ App Router (app directory)
  const hasAppDir = filePaths.some(p => p.startsWith('app/'));
  if (hasAppDir) {
    const nextAppPage = filePaths.find(p =>
      p === 'app/page.jsx' || p === 'app/page.tsx' || p === 'app/page.js' || p === 'app/page.ts'
    );
    if (nextAppPage) {
      console.log('[EntryPointDetector] Detected Next.js App Router at', nextAppPage);
      return {
        path: nextAppPage,
        framework: 'next',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'Next.js App Router (v13+)',
      };
    }
  }

  // Check for Next.js Pages Router
  const hasPageDir = filePaths.some(p => p.startsWith('pages/'));
  if (hasPageDir) {
    const nextPagesIndex = filePaths.find(p =>
      p === 'pages/index.jsx' || p === 'pages/index.tsx' || p === 'pages/index.js' || p === 'pages/index.ts'
    );
    if (nextPagesIndex) {
      console.log('[EntryPointDetector] Detected Next.js Pages Router at', nextPagesIndex);
      return {
        path: nextPagesIndex,
        framework: 'next',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'Next.js Pages Router',
      };
    }
  }

  // Check for Vite configuration
  const hasViteConfig = filePaths.some(p => p === 'vite.config.js' || p === 'vite.config.ts');
  if (hasViteConfig) {
    // Vite + React
    const reactSrcIndex = filePaths.find(p =>
      p === 'src/index.jsx' || p === 'src/index.tsx' || p === 'src/index.js' || p === 'src/index.ts'
    );
    if (reactSrcIndex) {
      console.log('[EntryPointDetector] Detected Vite + React at', reactSrcIndex);
      return {
        path: reactSrcIndex,
        framework: 'react',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'Vite + React',
      };
    }

    // Vite + Vue
    const vueSrcApp = filePaths.find(p => p === 'src/App.vue');
    if (vueSrcApp) {
      console.log('[EntryPointDetector] Detected Vite + Vue at', vueSrcApp);
      return {
        path: vueSrcApp,
        framework: 'vue',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'Vite + Vue',
      };
    }

    // Vite + Svelte
    const svelteSrcApp = filePaths.find(p => p === 'src/App.svelte');
    if (svelteSrcApp) {
      console.log('[EntryPointDetector] Detected Vite + Svelte at', svelteSrcApp);
      return {
        path: svelteSrcApp,
        framework: 'svelte',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'Vite + Svelte',
      };
    }
  }

  // Check for Svelte Kit
  const hasSvelteKitConfig = filePaths.some(p => p === 'svelte.config.js' || p === 'svelte.config.ts');
  if (hasSvelteKitConfig) {
    const svelteKitPage = filePaths.find(p => p === 'src/routes/+page.svelte');
    if (svelteKitPage) {
      console.log('[EntryPointDetector] Detected SvelteKit at', svelteKitPage);
      return {
        path: svelteKitPage,
        framework: 'svelte',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'SvelteKit',
      };
    }
  }

  // Check for Nuxt (Vue meta framework)
  const hasNuxtConfig = filePaths.some(p => p === 'nuxt.config.ts' || p === 'nuxt.config.js');
  if (hasNuxtConfig) {
    const nuxtPage = filePaths.find(p => p === 'pages/index.vue' || p === 'app.vue');
    if (nuxtPage) {
      console.log('[EntryPointDetector] Detected Nuxt at', nuxtPage);
      return {
        path: nuxtPage,
        framework: 'vue',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'Nuxt',
      };
    }
  }

  // React with src directory (CRA or similar)
  const reactSrcApp = filePaths.find(p =>
    p === 'src/App.jsx' || p === 'src/App.tsx' || p === 'src/App.js' || p === 'src/App.ts'
  );
  if (reactSrcApp) {
    const srcIndex = filePaths.find(p =>
      p === 'src/index.jsx' || p === 'src/index.tsx' || p === 'src/index.js' || p === 'src/index.ts'
    );
    const entryFile = srcIndex || reactSrcApp;
    console.log('[EntryPointDetector] Detected React (with src) at', entryFile);
    return {
      path: entryFile,
      framework: 'react',
      type: 'entry',
      previewPath: '/',
      devServerUrl: devServerUrl,
      description: 'React (with src directory)',
    };
  }

  // React without src directory
  const reactApp = filePaths.find(p =>
    p === 'App.jsx' || p === 'App.tsx' || p === 'App.js' || p === 'App.ts'
  );
  if (reactApp) {
    const indexFile = filePaths.find(p =>
      p === 'index.jsx' || p === 'index.tsx' || p === 'index.js' || p === 'index.ts'
    );
    const entryFile = indexFile || reactApp;
    console.log('[EntryPointDetector] Detected React (root) at', entryFile);
    return {
      path: entryFile,
      framework: 'react',
      type: 'entry',
      previewPath: '/',
      devServerUrl: devServerUrl,
      description: 'React',
    };
  }

  // Vue 3 SFC (standalone)
  const vueApp = filePaths.find(p => p === 'src/App.vue' || p === 'App.vue');
  if (vueApp) {
    console.log('[EntryPointDetector] Detected Vue at', vueApp);
    return {
      path: vueApp,
      framework: 'vue',
      type: 'entry',
      previewPath: '/',
      devServerUrl: devServerUrl,
      description: 'Vue 3',
    };
  }

  // Svelte (standalone)
  const svelteApp = filePaths.find(p => p === 'src/App.svelte' || p === 'App.svelte');
  if (svelteApp) {
    console.log('[EntryPointDetector] Detected Svelte at', svelteApp);
    return {
      path: svelteApp,
      framework: 'svelte',
      type: 'entry',
      previewPath: '/',
      devServerUrl: devServerUrl,
      description: 'Svelte',
    };
  }

  // Static HTML - root level
  const indexHtml = filePaths.find(p => p === 'index.html');
  if (indexHtml) {
    console.log('[EntryPointDetector] Detected static HTML at', indexHtml);
    return {
      path: indexHtml,
      framework: 'html',
      type: 'entry',
      previewPath: '/',
      devServerUrl: devServerUrl,
      description: 'Static HTML',
    };
  }

  // HTML in src directory
  const srcIndexHtml = filePaths.find(p => p === 'src/index.html');
  if (srcIndexHtml) {
    console.log('[EntryPointDetector] Detected HTML in src at', srcIndexHtml);
    return {
      path: srcIndexHtml,
      framework: 'html',
      type: 'entry',
      previewPath: '/',
      devServerUrl: devServerUrl,
      description: 'Static HTML (in src)',
    };
  }

  // Create React App structure
  const hasCraStructure = filePaths.some(p =>
    (p === 'public/index.html' || p === 'src/index.js' || p === 'src/index.jsx')
  );
  if (hasCraStructure) {
    const srcIndex = filePaths.find(p => p === 'src/index.js' || p === 'src/index.jsx');
    if (srcIndex) {
      console.log('[EntryPointDetector] Detected CRA structure at', srcIndex);
      return {
        path: srcIndex,
        framework: 'react',
        type: 'entry',
        previewPath: '/',
        devServerUrl: devServerUrl,
        description: 'Create React App',
      };
    }
  }

  // Fallback: look for any page.* or index.* at common locations
  const fallbackEntry = filePaths.find(p =>
    p.match(/^(page|index)\.(jsx?|tsx?|html|vue|svelte)$/) ||
    p.match(/^src\/(page|index)\.(jsx?|tsx?|html|vue|svelte)$/) ||
    p.match(/^(src\/)?routes\/\+page\.svelte$/)
  );
  if (fallbackEntry) {
    console.log('[EntryPointDetector] Detected fallback entry at', fallbackEntry);
    return {
      path: fallbackEntry,
      framework: 'unknown',
      type: 'entry',
      previewPath: '/',
      devServerUrl: devServerUrl,
      description: 'Web App',
    };
  }

  console.log('[EntryPointDetector] No entry point detected from', filePaths.length, 'files');
  return null;
}

/**
 * Get a human-readable label for the detected framework
 */
export function getFrameworkLabel(framework) {
  const labels = {
    'next': 'Next.js',
    'react': 'React',
    'vue': 'Vue',
    'svelte': 'Svelte',
    'html': 'HTML',
    'unknown': 'Web App',
  };
  return labels[framework] || framework;
}

/**
 * Detect the appropriate preview URL based on framework and dev server
 */
export function getPreviewUrl(entryPoint, devServerUrl = 'http://localhost:3001') {
  if (!entryPoint) {
    return devServerUrl;
  }

  // For Next.js, always use the root path
  if (entryPoint.framework === 'next') {
    return `${devServerUrl}/`;
  }

  // For React apps, use the root path
  if (entryPoint.framework === 'react') {
    return `${devServerUrl}/`;
  }

  // For Vue, Svelte, HTML apps, use the root path
  if (['vue', 'svelte', 'html'].includes(entryPoint.framework)) {
    return `${devServerUrl}/`;
  }

  // Default to root path
  return `${devServerUrl}/`;
}
