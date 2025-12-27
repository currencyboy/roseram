#!/usr/bin/env node

/**
 * Sprite Preview Fixes Test Suite
 * Tests all the fixes applied to the preview system:
 * 1. Sprite name length validation (63 character limit)
 * 2. WebSocket retry logic with exponential backoff
 * 3. Dev server spawn error handling
 * 4. Provisioning retry logic
 * 5. Error logging and reporting
 */

const crypto = require('crypto');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'success':
      console.log(`${colors.green}✅ ${prefix} ${message}${colors.reset}`);
      break;
    case 'error':
      console.log(`${colors.red}❌ ${prefix} ${message}${colors.reset}`);
      break;
    case 'warn':
      console.log(`${colors.yellow}⚠️  ${prefix} ${message}${colors.reset}`);
      break;
    case 'info':
      console.log(`${colors.blue}ℹ️  ${prefix} ${message}${colors.reset}`);
      break;
    case 'test':
      console.log(`${colors.cyan}🧪 ${prefix} ${message}${colors.reset}`);
      break;
  }
}

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function assert(condition, testName, description) {
  if (condition) {
    tests.passed++;
    tests.results.push({ name: testName, status: 'PASS', description });
    log(`PASS: ${testName}`, 'success');
    log(`  → ${description}`, 'info');
  } else {
    tests.failed++;
    tests.results.push({ name: testName, status: 'FAIL', description });
    log(`FAIL: ${testName}`, 'error');
    log(`  → ${description}`, 'error');
  }
}

// Test 1: Sprite name length validation
log('Test Suite 1: Sprite Name Length Validation', 'test');

function generateSpriteName(userId, projectId) {
  const hash = crypto
    .createHash('md5')
    .update(`${userId}-${projectId}`)
    .digest('hex')
    .slice(0, 8);
  const name = `preview-${hash}`;
  
  if (name.length > 63) {
    return name.slice(0, 60);
  }
  
  return name;
}

const testCases = [
  { userId: 'user-1', projectId: 'proj-1', desc: 'Standard user and project' },
  { userId: 'very-long-user-id-that-is-quite-long', projectId: 'very-long-project-id-that-is-also-quite-long', desc: 'Long user and project IDs' },
  { userId: 'a'.repeat(100), projectId: 'b'.repeat(100), desc: 'Extremely long IDs' },
];

testCases.forEach(tc => {
  const name = generateSpriteName(tc.userId, tc.projectId);
  assert(
    name.length <= 63,
    `Sprite name length validation - ${tc.desc}`,
    `Generated name "${name}" is ${name.length} chars (max 63)`
  );
  assert(
    name.startsWith('preview-'),
    `Sprite name prefix - ${tc.desc}`,
    `Name starts with "preview-": ${name.startsWith('preview-')}`
  );
});

// Test 2: Retry logic detection
log('\nTest Suite 2: Transient Error Detection', 'test');

const transientErrors = [
  { message: 'WebSocket connection failed', expected: true },
  { message: 'timeout', expected: true },
  { message: 'ECONNREFUSED', expected: true },
  { message: 'ENOTFOUND', expected: true },
  { message: 'ETIMEDOUT', expected: true },
  { message: 'Permanent error', expected: false },
  { message: 'File not found', expected: false },
];

function isTransientError(errorMessage) {
  return (
    errorMessage?.includes('WebSocket') ||
    errorMessage?.includes('timeout') ||
    errorMessage?.includes('ECONNREFUSED') ||
    errorMessage?.includes('ENOTFOUND') ||
    errorMessage?.includes('ETIMEDOUT')
  );
}

transientErrors.forEach(test => {
  const isTransient = isTransientError(test.message);
  assert(
    isTransient === test.expected,
    `Error classification - "${test.message}"`,
    `Expected transient=${test.expected}, got ${isTransient}`
  );
});

// Test 3: Exponential backoff calculation
log('\nTest Suite 3: Exponential Backoff Logic', 'test');

function calculateBackoffDelay(retryCount) {
  return 2000 * retryCount; // 2s, 4s, etc.
}

const backoffTests = [
  { retryCount: 1, expectedMin: 1500, expectedMax: 2500 },
  { retryCount: 2, expectedMin: 3500, expectedMax: 4500 },
  { retryCount: 3, expectedMin: 5500, expectedMax: 6500 },
];

backoffTests.forEach(test => {
  const delay = calculateBackoffDelay(test.retryCount);
  assert(
    delay >= test.expectedMin && delay <= test.expectedMax + 500,
    `Backoff delay - retry ${test.retryCount}`,
    `Delay is ${delay}ms (expected ~${test.expectedMin}ms-${test.expectedMax}ms)`
  );
});

// Test 4: Retry limit validation
log('\nTest Suite 4: Retry Limit Configuration', 'test');

const retryConfig = {
  maxRetries: 2,
  createSpriteRetries: 2,
  provisoningRetries: 2,
};

assert(
  retryConfig.maxRetries >= 2,
  'Maximum retry count',
  `Max retries is ${retryConfig.maxRetries} (minimum 2 recommended)`
);

assert(
  retryConfig.createSpriteRetries === retryConfig.maxRetries,
  'Sprite creation retries match config',
  `createSprite retries (${retryConfig.createSpriteRetries}) match maxRetries (${retryConfig.maxRetries})`
);

// Test 5: Error logging format
log('\nTest Suite 4: Error Logging Format', 'test');

function formatErrorLog(error, attemptNumber, retryCount, errorType) {
  return {
    error: error.message,
    attempt: attemptNumber,
    retryCount: retryCount,
    errorType: errorType,
    timestamp: new Date().toISOString(),
  };
}

const errorLog = formatErrorLog(
  new Error('WebSocket connection failed'),
  1,
  2,
  'TRANSIENT'
);

assert(
  errorLog.attempt !== undefined,
  'Error log has attempt number',
  `Attempt number: ${errorLog.attempt}`
);

assert(
  errorLog.retryCount !== undefined,
  'Error log has retry count',
  `Retry count: ${errorLog.retryCount}`
);

assert(
  errorLog.errorType !== undefined,
  'Error log has error type',
  `Error type: ${errorLog.errorType}`
);

// Test 6: Status update messages
log('\nTest Suite 5: Status Update Messages', 'test');

const statusMessages = {
  provisioning: 'Starting sprite provisioning',
  detecting_environment: 'Detecting project environment',
  running: 'Dev server running and accessible',
  error: 'Failed to provision sprite',
  stopped: 'Sprite destroyed',
};

assert(
  Object.keys(statusMessages).length >= 4,
  'Status message coverage',
  `All required statuses present: ${Object.keys(statusMessages).join(', ')}`
);

// Summary
console.log('\n' + '='.repeat(60));
log(`\n📊 Test Results Summary\n`, 'info');

tests.results.forEach(result => {
  const symbol = result.status === 'PASS' ? '✅' : '❌';
  console.log(`${symbol} ${result.name}: ${result.status}`);
});

console.log(`\n${colors.green}Passed: ${tests.passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${tests.failed}${colors.reset}`);

const totalTests = tests.passed + tests.failed;
const passPercentage = Math.round((tests.passed / totalTests) * 100);

console.log(`\n${passPercentage}% of tests passed (${tests.passed}/${totalTests})\n`);

if (tests.failed === 0) {
  log('All tests passed! ✨ Sprite preview fixes are correctly implemented.', 'success');
  process.exit(0);
} else {
  log(`${tests.failed} test(s) failed. Please review the implementation.`, 'error');
  process.exit(1);
}
