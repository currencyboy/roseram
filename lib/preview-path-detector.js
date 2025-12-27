/**
 * Intelligently detect the most relevant preview path based on codebase analysis
 * Used when Grok generates changes to suggest the best page/route to display
 */

export function detectBestPreviewPath(codebaseAnalysis, generatedFiles = []) {
  if (!codebaseAnalysis) {
    return '/';
  }

  const { projectStructure = '', techStack = [], fileTree = [] } = codebaseAnalysis;
  const projectStructureLower = projectStructure.toLowerCase();

  // Analyze the generated files to understand what was changed
  const changedPaths = generatedFiles.map(f => f.path.toLowerCase());

  // Check if this is a Next.js app
  const isNextApp = projectStructureLower.includes('app/') || projectStructureLower.includes('pages/');
  if (isNextApp) {
    return detectNextJsPath(projectStructure, changedPaths);
  }

  // Check if this is a React app
  const isReactApp = techStack.includes('React') || projectStructureLower.includes('src/');
  if (isReactApp) {
    return detectReactPath(projectStructure, changedPaths);
  }

  // Check if it's a static site or other framework
  return detectStaticSitePath(projectStructure, changedPaths);
}

/**
 * Detect best path for Next.js applications
 */
function detectNextJsPath(projectStructure, changedPaths) {
  // Priority order for Next.js routes
  const priorityPaths = [
    '/dashboard',
    '/admin',
    '/app',
    '/home',
    '/index',
    '/blog',
    '/docs',
    '/',
  ];

  // Check if any generated files are in these paths
  for (const path of priorityPaths) {
    for (const changed of changedPaths) {
      if (changed.includes(`app/${path}`) || changed.includes(`app${path}`) || changed.includes(`pages/${path}`)) {
        return path === '/index' ? '/' : path;
      }
    }
  }

  // If dashboard app detected in structure, navigate to /dashboard
  if (projectStructure.toLowerCase().includes('dashboard')) {
    return '/dashboard';
  }

  // If admin app detected in structure, navigate to /admin
  if (projectStructure.toLowerCase().includes('admin')) {
    return '/admin';
  }

  // Default to root
  return '/';
}

/**
 * Detect best path for React applications
 */
function detectReactPath(projectStructure, changedPaths) {
  const projectLower = projectStructure.toLowerCase();

  // Look for common React app structure
  if (projectLower.includes('src/pages/') || projectLower.includes('src/app/')) {
    const priorityPaths = ['/dashboard', '/home', '/app', '/'];

    for (const path of priorityPaths) {
      for (const changed of changedPaths) {
        if (changed.includes(`src/pages${path}`) || changed.includes(`src/app${path}`)) {
          return path;
        }
      }
    }
  }

  // Check if there are route indicators in changed files
  for (const changed of changedPaths) {
    if (changed.includes('dashboard')) return '/dashboard';
    if (changed.includes('home')) return '/home';
    if (changed.includes('admin')) return '/admin';
  }

  return '/';
}

/**
 * Detect best path for static sites or other frameworks
 */
function detectStaticSitePath(projectStructure, changedPaths) {
  const projectLower = projectStructure.toLowerCase();

  // Check for index page indicators
  if (projectLower.includes('index.html') || projectLower.includes('home')) {
    return '/';
  }

  // Check for common site sections
  const commonPaths = {
    'about': '/about',
    'contact': '/contact',
    'portfolio': '/portfolio',
    'blog': '/blog',
    'products': '/products',
    'services': '/services',
    'features': '/features',
  };

  for (const [key, path] of Object.entries(commonPaths)) {
    for (const changed of changedPaths) {
      if (changed.includes(key)) {
        return path;
      }
    }
    if (projectLower.includes(key)) {
      return path;
    }
  }

  return '/';
}

/**
 * Analyze generated files to guess the primary feature being built
 */
export function analyzeGeneratedFilesForContext(generatedFiles = []) {
  const analysis = {
    primaryFeature: null,
    suggestedPath: '/',
    fileCounts: {
      pages: 0,
      components: 0,
      api: 0,
      styles: 0,
      other: 0,
    },
  };

  for (const file of generatedFiles) {
    const path = file.path.toLowerCase();

    if (path.includes('page.') || path.includes('pages/')) {
      analysis.fileCounts.pages++;
    } else if (path.includes('component')) {
      analysis.fileCounts.components++;
    } else if (path.includes('api/')) {
      analysis.fileCounts.api++;
    } else if (path.includes('.css') || path.includes('.scss')) {
      analysis.fileCounts.styles++;
    } else {
      analysis.fileCounts.other++;
    }

    // Detect primary feature from file names
    if (path.includes('dashboard')) {
      analysis.primaryFeature = 'dashboard';
      analysis.suggestedPath = '/dashboard';
    } else if (path.includes('admin')) {
      analysis.primaryFeature = 'admin';
      analysis.suggestedPath = '/admin';
    } else if (path.includes('product') || path.includes('catalog')) {
      analysis.primaryFeature = 'products';
      analysis.suggestedPath = '/products';
    } else if (path.includes('blog') || path.includes('article')) {
      analysis.primaryFeature = 'blog';
      analysis.suggestedPath = '/blog';
    }
  }

  return analysis;
}

/**
 * Get a human-readable description of the detected preview path
 */
export function getPreviewPathDescription(path) {
  const descriptions = {
    '/': 'Home page',
    '/dashboard': 'Dashboard',
    '/admin': 'Admin panel',
    '/home': 'Home',
    '/blog': 'Blog section',
    '/products': 'Products page',
    '/services': 'Services page',
    '/about': 'About page',
    '/contact': 'Contact page',
    '/portfolio': 'Portfolio page',
  };

  return descriptions[path] || `Page: ${path}`;
}
