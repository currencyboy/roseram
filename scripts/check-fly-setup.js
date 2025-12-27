#!/usr/bin/env node

/**
 * Fly.io Setup Diagnostic Script
 * 
 * Checks if all components are properly configured for Fly.io deployments
 * Run: node scripts/check-fly-setup.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvVar(name) {
  const value = process.env[name];
  if (value) {
    const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
    log(`  ✓ ${name}: ${masked}`, 'green');
    return true;
  } else {
    log(`  ✗ ${name}: NOT SET`, 'red');
    return false;
  }
}

function checkFile(filePath) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`  ✓ ${filePath}`, 'green');
    return true;
  } else {
    log(`  ✗ ${filePath}: NOT FOUND`, 'red');
    return false;
  }
}

function checkFileContent(filePath, searchStrings) {
  if (!fs.existsSync(filePath)) {
    log(`  ✗ ${filePath}: FILE NOT FOUND`, 'red');
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const results = searchStrings.map(str => content.includes(str));
  
  if (results.every(r => r)) {
    log(`  ✓ ${filePath}`, 'green');
    return true;
  } else {
    log(`  ✗ ${filePath}: Missing required content`, 'red');
    return false;
  }
}

function runChecks() {
  log('\n🔍 Fly.io Setup Diagnostic\n', 'cyan');
  
  let allPassed = true;

  // 1. Environment Variables
  log('1. Environment Variables', 'blue');
  const envVars = [
    'FLY_IO_TOKEN',
    'NEXT_PUBLIC_GITHUB_ACCESS_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON',
    'SUPABASE_SERVICE_ROLE',
  ];

  let envPassed = true;
  for (const envVar of envVars) {
    if (!checkEnvVar(envVar)) {
      envPassed = false;
    }
  }
  allPassed = allPassed && envPassed;

  // 2. Database Migration
  log('\n2. Database Migration', 'blue');
  const migrationFile = 'supabase/migrations/add_fly_preview_apps.sql';
  if (!checkFile(migrationFile)) {
    allPassed = false;
  } else {
    log('  ℹ️  Migration file exists. Apply it in Supabase if not already done.', 'yellow');
  }

  // 3. API Endpoints
  log('\n3. API Endpoints', 'blue');
  const endpoints = [
    'app/api/fly-preview/route.js',
    'app/api/deploy-preview/route.js',
    'app/api/preview-instance/route.js',
  ];

  for (const endpoint of endpoints) {
    if (!checkFile(endpoint)) {
      allPassed = false;
    }
  }

  // 4. GitHub Actions Workflow
  log('\n4. GitHub Actions Workflow', 'blue');
  const workflowFile = '.github/workflows/deploy-preview.yml';
  if (!checkFile(workflowFile)) {
    allPassed = false;
  } else {
    log('  ℹ️  Workflow file exists. Make sure to:', 'yellow');
    log('     - Commit and push to GitHub', 'yellow');
    log('     - Add FLY_API_TOKEN secret to GitHub Actions', 'yellow');
  }

  // 5. Required Components
  log('\n5. Component Files', 'blue');
  const components = [
    'components/FlyPreview.jsx',
    'components/UnifiedPreviewPanel.jsx',
    'lib/fly-deployment.js',
    'lib/flyio.js',
  ];

  for (const comp of components) {
    if (!checkFile(comp)) {
      allPassed = false;
    }
  }

  // 6. Documentation
  log('\n6. Documentation', 'blue');
  const docs = [
    'FLY_IO_QUICK_START.md',
    'FLY_IO_DEPLOYMENT_COMPLETE.md',
  ];

  for (const doc of docs) {
    if (!checkFile(doc)) {
      allPassed = false;
    }
  }

  // 7. File Content Checks
  log('\n7. Content Verification', 'blue');
  
  const checks = [
    {
      file: 'app/api/fly-preview/route.js',
      strings: ['fly_preview_apps', 'getUserFromRequest', 'supabaseServer'],
    },
    {
      file: 'app/api/deploy-preview/route.js',
      strings: ['Octokit', 'workflow_dispatch', 'github_repo_url'],
    },
    {
      file: '.github/workflows/deploy-preview.yml',
      strings: ['deploy-preview', 'superfly/flyctl-actions', 'FLY_API_TOKEN'],
    },
  ];

  for (const check of checks) {
    if (!checkFileContent(check.file, check.strings)) {
      allPassed = false;
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  
  if (allPassed) {
    log('✅ All checks passed! Fly.io setup is complete.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Apply database migration in Supabase dashboard', 'cyan');
    log('2. Commit and push .github/workflows/deploy-preview.yml to GitHub', 'cyan');
    log('3. Add FLY_API_TOKEN secret to GitHub repository', 'cyan');
    log('4. Test by creating a preview deployment', 'cyan');
  } else {
    log('⚠️  Some checks failed. Review the output above.', 'yellow');
    log('\nCommon fixes:', 'cyan');
    log('- Verify environment variables are set', 'cyan');
    log('- Check .env file exists and has required variables', 'cyan');
    log('- Ensure all files were created in the correct locations', 'cyan');
    log('- Run this script again after fixing issues', 'cyan');
  }

  log('='.repeat(50) + '\n', 'blue');

  // Additional Information
  log('📚 For more information:', 'cyan');
  log('- Quick Start: FLY_IO_QUICK_START.md', 'cyan');
  log('- Full Guide: FLY_IO_DEPLOYMENT_COMPLETE.md', 'cyan');
  log('- Fly.io Docs: https://fly.io/docs/', 'cyan');
  log('- GitHub Actions: https://docs.github.com/en/actions\n', 'cyan');

  process.exit(allPassed ? 0 : 1);
}

runChecks();
