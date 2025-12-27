#!/usr/bin/env node

/**
 * Verify Sprites Integration Setup
 * Checks if all components are properly configured for Sprites preview
 */

const fs = require('fs');
const path = require('path');

function log(message, color = 'white') {
  const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
  log('\n🔍 Checking Environment Variables\n', 'blue');
  
  const required = [
    'SPRITES_TOKEN',
    'NEXT_PUBLIC_SUPABASE_PROJECT_URL',
    'SUPABASE_ANON',
    'NEXT_SUPABASE_SERVICE_ROLE'
  ];

  let allSet = true;
  required.forEach(env => {
    const value = process.env[env];
    if (value) {
      const masked = value.length > 20 ? value.substring(0, 20) + '...' : value;
      log(`✅ ${env}: ${masked}`, 'green');
    } else {
      log(`❌ ${env}: NOT SET`, 'red');
      allSet = false;
    }
  });

  return allSet;
}

function checkFiles() {
  log('\n📁 Checking Required Files\n', 'blue');

  const files = [
    'lib/sprites-service.js',
    'app/api/sprites-preview/route.js',
    'components/QuickPreview.jsx',
    'components/AutoSpritesPreview.jsx',
    'components/AutoPreview.jsx',
  ];

  let allExist = true;
  files.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file}: NOT FOUND`, 'red');
      allExist = false;
    }
  });

  return allExist;
}

function checkSpritesService() {
  log('\n⚙️  Checking Sprites Service\n', 'blue');

  try {
    const serviceCode = fs.readFileSync('lib/sprites-service.js', 'utf8');
    
    const checks = [
      { name: 'SpritesClient initialization', pattern: /new SpritesClient/ },
      { name: 'createSprite method', pattern: /createSprite\s*\(/ },
      { name: 'setupAndRunDevServer method', pattern: /setupAndRunDevServer\s*\(/ },
      { name: 'destroySprite method', pattern: /destroySprite\s*\(/ },
      { name: 'SPRITES_TOKEN check', pattern: /SPRITES_TOKEN/ },
    ];

    let allFound = true;
    checks.forEach(check => {
      if (check.pattern.test(serviceCode)) {
        log(`✅ ${check.name}`, 'green');
      } else {
        log(`❌ ${check.name}: NOT FOUND`, 'red');
        allFound = false;
      }
    });

    return allFound;
  } catch (err) {
    log(`❌ Error reading sprites-service.js: ${err.message}`, 'red');
    return false;
  }
}

function checkAPIEndpoint() {
  log('\n🔌 Checking API Endpoints\n', 'blue');

  try {
    const routeCode = fs.readFileSync('app/api/sprites-preview/route.js', 'utf8');
    
    const checks = [
      { name: 'GET handler', pattern: /export\s+async\s+function\s+GET/ },
      { name: 'POST handler', pattern: /export\s+async\s+function\s+POST/ },
      { name: 'DELETE handler', pattern: /export\s+async\s+function\s+DELETE/ },
      { name: 'spritesService usage', pattern: /spritesService\.(create|destroy|setup|get)/ },
    ];

    let allFound = true;
    checks.forEach(check => {
      if (check.pattern.test(routeCode)) {
        log(`✅ ${check.name}`, 'green');
      } else {
        log(`❌ ${check.name}: NOT FOUND`, 'red');
        allFound = false;
      }
    });

    return allFound;
  } catch (err) {
    log(`❌ Error reading sprites-preview route: ${err.message}`, 'red');
    return false;
  }
}

function checkComponentIntegration() {
  log('\n🎨 Checking Component Integration\n', 'blue');

  try {
    const quickPreview = fs.readFileSync('components/QuickPreview.jsx', 'utf8');
    const autoSprites = fs.readFileSync('components/AutoSpritesPreview.jsx', 'utf8');
    
    let allGood = true;

    // Check QuickPreview uses Sprites API
    if (quickPreview.includes('/api/sprites-preview')) {
      log('✅ QuickPreview uses /api/sprites-preview', 'green');
    } else {
      log('❌ QuickPreview does not use /api/sprites-preview', 'red');
      allGood = false;
    }

    // Check QuickPreview doesn't use instant-preview
    if (!quickPreview.includes('/api/instant-preview')) {
      log('✅ QuickPreview removed /api/instant-preview', 'green');
    } else {
      log('⚠️  QuickPreview still references /api/instant-preview', 'yellow');
    }

    // Check AutoSpritesPreview uses Sprites
    if (autoSprites.includes('/api/sprites-preview')) {
      log('✅ AutoSpritesPreview uses /api/sprites-preview', 'green');
    } else {
      log('❌ AutoSpritesPreview does not use /api/sprites-preview', 'red');
      allGood = false;
    }

    return allGood;
  } catch (err) {
    log(`❌ Error checking components: ${err.message}`, 'red');
    return false;
  }
}

function main() {
  log('\n' + '='.repeat(50), 'blue');
  log('SPRITES INTEGRATION VERIFICATION', 'blue');
  log('='.repeat(50), 'blue');

  const envCheck = checkEnvironment();
  const filesCheck = checkFiles();
  const serviceCheck = checkSpritesService();
  const apiCheck = checkAPIEndpoint();
  const componentCheck = checkComponentIntegration();

  log('\n' + '='.repeat(50), 'blue');
  
  if (envCheck && filesCheck && serviceCheck && apiCheck && componentCheck) {
    log('✅ ALL CHECKS PASSED - Sprites integration is complete!', 'green');
    log('\nYour preview system is now using Sprites:', 'green');
    log('  • QuickPreview → /api/sprites-preview', 'green');
    log('  • AutoSpritesPreview → /api/sprites-preview', 'green');
    log('  • AutoPreview → /api/auto-preview (internally uses Sprites)', 'green');
    process.exit(0);
  } else {
    log('❌ SOME CHECKS FAILED - Review the items marked above', 'red');
    log('\nTo fix:', 'yellow');
    log('  1. Set missing environment variables', 'yellow');
    log('  2. Ensure all required files are in place', 'yellow');
    log('  3. Check that components are properly updated', 'yellow');
    process.exit(1);
  }
}

main();
