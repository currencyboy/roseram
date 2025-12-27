/**
 * Project Scaffolder - Generates boilerplate files for different frameworks
 */

const FRAMEWORK_TEMPLATES = {
  'next': {
    name: 'Next.js',
    files: {
      'package.json': (projectName, db, email) => ({
        name: projectName,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          next: '^14.0.0',
          ...(db === 'supabase' && { '@supabase/supabase-js': '^2.38.0' }),
          ...(db === 'neon' && { '@neondatabase/serverless': '^0.4.0' }),
          ...(db === 'prisma' && { '@prisma/client': '^5.0.0' }),
          ...(email === 'resend' && { resend: '^1.0.0' }),
          ...(email === 'sendgrid' && { '@sendgrid/mail': '^8.0.0' }),
        },
        devDependencies: {
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          'autoprefixer': '^10.4.0',
          'postcss': '^8.4.0',
          'tailwindcss': '^3.3.0',
          ...(db === 'prisma' && { prisma: '^5.0.0' }),
        },
      }),
      
      'tsconfig.json': (projectName, db, email) => ({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          resolveJsonModule: true,
          isolatedModules: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          noEmit: true,
          jsx: 'preserve',
          incremental: true,
          paths: {
            '@/*': ['./*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
        exclude: ['node_modules'],
      }),

      'next.config.js': (projectName, db, email) => `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
`,

      'tailwind.config.js': (projectName, db, email) => `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`,

      'postcss.config.js': (projectName, db, email) => `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,

      'app/page.tsx': (projectName, db, email) => `'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    ${db === 'supabase' ? `
    // Initialize Supabase
    const initSupabase = async () => {
      try {
        setStatus('Connected to Supabase');
      } catch (error) {
        setStatus('Error connecting to Supabase');
      }
    };
    initSupabase();
    ` : '// Initialize app'}
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ${projectName}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your ${db ? db.charAt(0).toUpperCase() + db.slice(1) + ' + ' : ''}${email ? email.charAt(0).toUpperCase() + email.slice(1) + ' ' : ''}Next.js project is ready!
        </p>
        <div className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Status: {status}
        </div>
      </div>
    </main>
  );
}
`,

      '.gitignore': (projectName, db, email) => `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode
.idea
`,

      'README.md': (projectName, db, email) => `# ${projectName}

A modern Next.js application${db ? ` with ${db}` : ''}${email ? ` and ${email}` : ''}.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

${db === 'supabase' ? `
## Supabase Setup

Set up your Supabase environment variables in \`.env.local\`:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
\`\`\`
` : ''}

${email === 'resend' ? `
## Resend Setup

Set up your Resend API key in \`.env.local\`:

\`\`\`
RESEND_API_KEY=your_key
\`\`\`
` : ''}

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
${db === 'supabase' ? '- [Supabase Documentation](https://supabase.com/docs)' : ''}
`,
    },
  },

  'react': {
    name: 'React + Vite',
    files: {
      'package.json': (projectName, db, email) => ({
        name: projectName,
        private: true,
        version: '0.0.1',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          ...(db === 'supabase' && { '@supabase/supabase-js': '^2.38.0' }),
          ...(email === 'resend' && { resend: '^1.0.0' }),
        },
        devDependencies: {
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          '@vitejs/plugin-react': '^4.0.0',
          typescript: '^5.0.0',
          vite: '^4.3.9',
        },
      }),

      'vite.config.ts': (projectName, db, email) => `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,

      'index.html': (projectName, db, email) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,

      'src/App.tsx': (projectName, db, email) => `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container">
      <h1>${projectName}</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
    </div>
  )
}

export default App
`,

      'src/main.tsx': (projectName, db, email) => `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,

      'src/index.css': (projectName, db, email) => `:root {
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
}

body {
  color: #213547;
  background-color: #ffffff;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}
`,

      '.gitignore': (projectName, db, email) => `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`,

      'README.md': (projectName, db, email) => `# ${projectName}

A React application built with Vite.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open your browser and navigate to the URL shown in the terminal.

## Learn More

- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
`,
    },
  },

  'html': {
    name: 'Static HTML',
    files: {
      'index.html': (projectName, db, email) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="container">
      <h1>${projectName}</h1>
    </div>
  </nav>
  
  <main class="container">
    <section class="hero">
      <h2>Welcome to ${projectName}</h2>
      <p>Your static website is ready to go!</p>
      <button class="btn" onclick="handleClick()">Click Me</button>
    </section>
  </main>

  <footer>
    <p>&copy; 2024 ${projectName}. All rights reserved.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>
`,

      'styles.css': (projectName, db, email) => `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
}

.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.navbar h1 {
  font-size: 1.5rem;
}

main {
  padding: 4rem 0;
  min-height: calc(100vh - 200px);
}

.hero {
  text-align: center;
  padding: 4rem 0;
}

.hero h2 {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #667eea;
}

.hero p {
  font-size: 1.25rem;
  color: #666;
  margin-bottom: 2rem;
}

.btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

footer {
  background: #f5f5f5;
  padding: 2rem;
  text-align: center;
  color: #666;
  margin-top: 4rem;
  border-top: 1px solid #ddd;
}
`,

      'script.js': (projectName, db, email) => `console.log('Welcome to ${projectName}!');

function handleClick() {
  alert('Hello from ${projectName}!');
  console.log('Button clicked!');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded');
});
`,

      '.gitignore': (projectName, db, email) => `.DS_Store
node_modules/
dist/
.vscode
.idea
*.log
`,

      'README.md': (projectName, db, email) => `# ${projectName}

A static HTML, CSS, and JavaScript website.

## Getting Started

Simply open \`index.html\` in your browser, or use a local server:

\`\`\`bash
python -m http.server 8000
# or
npx http-server
\`\`\`

Then visit \`http://localhost:8000\`

## Customization

Edit \`styles.css\` for styling and \`script.js\` for functionality.
`,
    },
  },

  'vue': {
    name: 'Vue.js',
    files: {
      'package.json': (projectName, db, email) => ({
        name: projectName,
        private: true,
        version: '0.0.1',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          vue: '^3.3.0',
          ...(db === 'supabase' && { '@supabase/supabase-js': '^2.38.0' }),
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^4.0.0',
          vite: '^4.3.9',
          typescript: '^5.0.0',
        },
      }),

      'vite.config.ts': (projectName, db, email) => `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
`,

      'index.html': (projectName, db, email) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,

      'src/App.vue': (projectName, db, email) => `<template>
  <div id="app">
    <h1>${projectName}</h1>
    <p>Welcome to Vue 3!</p>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
#app {
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #42b983;
}
</style>
`,

      'src/main.ts': (projectName, db, email) => `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
`,

      '.gitignore': (projectName, db, email) => `node_modules
dist
.DS_Store
`,

      'README.md': (projectName, db, email) => `# ${projectName}

A Vue.js application.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Learn More

- [Vue Documentation](https://vuejs.org)
`,
    },
  },

  'svelte': {
    name: 'Svelte',
    files: {
      'package.json': (projectName, db, email) => ({
        name: projectName,
        private: true,
        version: '0.0.1',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {},
        devDependencies: {
          '@sveltejs/vite-plugin-svelte': '^2.0.0',
          svelte: '^4.0.0',
          typescript: '^5.0.0',
          vite: '^4.3.9',
        },
      }),

      'vite.config.ts': (projectName, db, email) => `import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
})
`,

      'index.html': (projectName, db, email) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,

      'src/App.svelte': (projectName, db, email) => `<script>
  let count = 0;

  function increment() {
    count += 1;
  }
</script>

<main>
  <h1>${projectName}</h1>
  <button on:click={increment}>
    Clicks: {count}
  </button>
</main>

<style>
  main {
    text-align: center;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  h1 {
    color: #ff3e00;
  }

  button {
    padding: 0.5rem 1rem;
    background: #ff3e00;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    opacity: 0.8;
  }
</style>
`,

      'src/main.ts': (projectName, db, email) => `import App from './App.svelte'

const app = new App({
  target: document.getElementById('app')!,
})

export default app
`,

      '.gitignore': (projectName, db, email) => `node_modules
dist
.DS_Store
`,

      'README.md': (projectName, db, email) => `# ${projectName}

A Svelte application.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Learn More

- [Svelte Documentation](https://svelte.dev)
`,
    },
  },
};

/**
 * Generate project files based on framework and integrations
 */
export function generateProjectFiles(framework, projectName, db, email) {
  const template = FRAMEWORK_TEMPLATES[framework];
  if (!template) {
    throw new Error(`Unknown framework: ${framework}`);
  }

  const files = {};
  for (const [filePath, fileGenerator] of Object.entries(template.files)) {
    let content = fileGenerator(projectName, db, email);
    
    // Convert object to JSON string for JSON files
    if (filePath.endsWith('.json') && typeof content === 'object') {
      content = JSON.stringify(content, null, 2);
    }

    files[filePath] = {
      path: filePath,
      content: content,
    };
  }

  return files;
}

/**
 * Get framework template by name
 */
export function getFrameworkTemplate(framework) {
  return FRAMEWORK_TEMPLATES[framework];
}

/**
 * List all available frameworks
 */
export function listFrameworks() {
  return Object.entries(FRAMEWORK_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
  }));
}
