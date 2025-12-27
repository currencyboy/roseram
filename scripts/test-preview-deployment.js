#!/usr/bin/env node

/**
 * Test Preview Deployment Configuration
 * 
 * Validates that the preview deployment system is correctly configured
 * to deploy the right repository to Fly.io
 * 
 * Run: node scripts/test-preview-deployment.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function testPreviewConfig() {
  log('\n🧪 Preview Deployment Configuration Test\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // Test 1: Check GitHub Actions workflow exists
  log('1. GitHub Actions Workflow', 'blue');
  const workflowPath = '.github/workflows/deploy-preview.yml';
  if (fs.existsSync(workflowPath)) {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    
    const checks = [
      { name: 'Git clone step', pattern: /git clone.*preview-repo/ },
      { name: 'Node.js setup', pattern: /setup-node/ },
      { name: 'Fly CLI setup', pattern: /superfly\/flyctl-actions/ },
      { name: 'Deploy command', pattern: /flyctl deploy/ },
      { name: 'Repository URL input', pattern: /repoUrl/ },
      { name: 'Branch input', pattern: /branch/ },
    ];

    let workflowPassed = true;
    for (const check of checks) {
      if (check.pattern.test(workflow)) {
        log(`  ✓ ${check.name}`, 'green');
        passed++;
      } else {
        log(`  ✗ ${check.name}: NOT FOUND`, 'red');
        workflowPassed = false;
        failed++;
      }
    }

    if (!workflowPassed) {
      log('  ℹ️  Workflow may need updates', 'yellow');
    }
  } else {
    log(`  ✗ Workflow file not found: ${workflowPath}`, 'red');
    failed++;
  }

  // Test 2: Check API endpoints exist
  log('\n2. API Endpoints', 'blue');
  const endpoints = [
    { path: 'app/api/fly-preview/route.js', name: 'fly-preview' },
    { path: 'app/api/deploy-preview/route.js', name: 'deploy-preview' },
  ];

  for (const endpoint of endpoints) {
    if (fs.existsSync(endpoint.path)) {
      const content = fs.readFileSync(endpoint.path, 'utf8');
      
      if (endpoint.name === 'fly-preview') {
        if (content.includes('repository_url') || content.includes('github_url')) {
          log(`  ✓ ${endpoint.name}: Repository URL handling`, 'green');
          passed++;
        } else {
          log(`  ✗ ${endpoint.name}: Missing repository URL handling`, 'red');
          failed++;
        }

        if (content.includes('working_branch') || content.includes('github_branch')) {
          log(`  ✓ ${endpoint.name}: Branch detection`, 'green');
          passed++;
        } else {
          log(`  ✗ ${endpoint.name}: Missing branch detection`, 'red');
          failed++;
        }
      } else if (endpoint.name === 'deploy-preview') {
        if (content.includes('Octokit') && content.includes('createWorkflowDispatch')) {
          log(`  ✓ ${endpoint.name}: GitHub Actions trigger`, 'green');
          passed++;
        } else {
          log(`  ✗ ${endpoint.name}: Missing GitHub Actions trigger`, 'red');
          failed++;
        }

        if (content.includes('github_repo_url')) {
          log(`  ✓ ${endpoint.name}: Passes repo URL to workflow`, 'green');
          passed++;
        } else {
          log(`  ✗ ${endpoint.name}: Doesn't pass repo URL`, 'red');
          failed++;
        }
      }
    } else {
      log(`  ✗ ${endpoint.path}: FILE NOT FOUND`, 'red');
      failed += 2;
    }
  }

  // Test 3: Check database schema
  log('\n3. Database Schema', 'blue');
  const migrationPath = 'supabase/migrations/add_fly_preview_apps.sql';
  if (fs.existsSync(migrationPath)) {
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    const columns = [
      { name: 'project_id', required: true },
      { name: 'user_id', required: true },
      { name: 'fly_app_name', required: true },
      { name: 'github_repo_url', required: true },
      { name: 'github_branch', required: true },
      { name: 'preview_url', required: true },
      { name: 'status', required: true },
    ];

    for (const col of columns) {
      if (migration.includes(col.name)) {
        log(`  ✓ Column: ${col.name}`, 'green');
        passed++;
      } else {
        log(`  ✗ Column: ${col.name} MISSING`, col.required ? 'red' : 'yellow');
        if (col.required) failed++;
      }
    }
  } else {
    log(`  ✗ Migration not found: ${migrationPath}`, 'red');
    failed++;
  }

  // Test 4: Check environment variables
  log('\n4. Environment Variables', 'blue');
  const envVars = [
    'FLY_IO_TOKEN',
    'GITHUB_ACCESS_TOKEN',
    'NEXT_PUBLIC_GITHUB_ACCESS_TOKEN',
  ];

  for (const envVar of envVars) {
    if (process.env[envVar]) {
      const masked = process.env[envVar].substring(0, 8) + '...' + process.env[envVar].substring(process.env[envVar].length - 3);
      log(`  ✓ ${envVar}`, 'green');
      passed++;
    } else {
      log(`  ✗ ${envVar}: NOT SET`, 'yellow');
    }
  }

  // Test 5: Configuration summary
  log('\n5. Deployment Flow Validation', 'blue');
  
  log('  Expected flow:', 'cyan');
  log('    1. User clicks "Start Server"', 'cyan');
  log('    2. API queries public.projects for repository_url + working_branch', 'cyan');
  log('    3. API creates record in fly_preview_apps', 'cyan');
  log('    4. API triggers /api/deploy-preview', 'cyan');
  log('    5. deploy-preview calls GitHub Actions with repository_url', 'cyan');
  log('    6. GitHub Actions clones from the full repository URL', 'cyan');
  log('    7. GitHub Actions deploys using flyctl', 'cyan');
  log('    8. Preview becomes available at preview_url', 'cyan');

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\n🎉 All checks passed! Preview deployment is configured correctly.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Verify GitHub secret FLY_API_TOKEN is set', 'cyan');
    log('2. Test with a real project that has a GitHub repository', 'cyan');
    log('3. Check GitHub Actions logs for deployment details', 'cyan');
  } else {
    log('\n⚠️  Some checks failed. Review the configuration above.', 'yellow');
  }

  log('='.repeat(50) + '\n', 'blue');

  process.exit(failed > 0 ? 1 : 0);
}

testPreviewConfig().catch(err => {
  log(`\n❌ Test error: ${err.message}`, 'red');
  process.exit(1);
});
