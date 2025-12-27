/**
 * Machine Setup Service
 * Handles incremental Fly.io machine setup with step-by-step control
 */

/**
 * @typedef {Object} SetupSession
 * @property {string} id
 * @property {string} projectId
 * @property {string} userId
 * @property {number} currentStep
 * @property {number[]} completedSteps
 * @property {'in_progress' | 'completed' | 'failed' | 'cancelled'} overallStatus
 * @property {string} [errorMessage]
 * @property {number} [errorStep]
 * @property {string} flyAppName
 * @property {string} previewUrl
 * @property {string} githubRepoUrl
 * @property {string} githubBranch
 * @property {string} createdAt
 * @property {string} [completedAt]
 */

/**
 * @typedef {Object} StepResult
 * @property {'completed' | 'error' | 'pending'} status
 * @property {Record<string, any>} details
 */

/**
 * Create or get an existing setup session
 * @param {string} projectId
 * @param {string} githubRepo
 * @param {string} [githubBranch='main']
 * @param {string} accessToken
 * @returns {Promise<SetupSession>}
 */
export async function initializeSetupSession(
  projectId,
  githubRepo,
  githubBranch = 'main',
  accessToken
) {
  const response = await fetch(
    `/api/machine-setup?projectId=${projectId}&githubRepo=${encodeURIComponent(githubRepo)}&githubBranch=${githubBranch}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to initialize setup session');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to initialize setup session');
  }

  return data.session;
}

/**
 * Execute a setup step
 * @param {string} sessionId
 * @param {number} stepNumber
 * @param {string} accessToken
 * @returns {Promise<{session: SetupSession, stepResult: StepResult}>}
 */
export async function executeSetupStep(
  sessionId,
  stepNumber,
  accessToken
) {
  const response = await fetch('/api/machine-setup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      sessionId,
      stepNumber,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to execute step ${stepNumber}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Failed to execute step ${stepNumber}`);
  }

  return {
    session: data.session,
    stepResult: data.stepResult,
  };
}

/**
 * Get setup session status
 * @param {string} sessionId
 * @param {string} accessToken
 * @returns {Promise<SetupSession>}
 */
export async function getSetupSessionStatus(
  sessionId,
  accessToken
) {
  const response = await fetch(`/api/machine-setup/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch setup session status');
  }

  const data = await response.json();
  return data.session;
}

/**
 * Calculate progress percentage
 * @param {number[]} completedSteps
 * @returns {number}
 */
export function calculateProgress(completedSteps) {
  return Math.round((completedSteps.length / 4) * 100);
}

/**
 * Format setup duration
 * @param {string} startDate
 * @param {string} [endDate]
 * @returns {string}
 */
export function formatDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Check if step can be executed
 * @param {number} stepNumber
 * @param {number[]} completedSteps
 * @returns {boolean}
 */
export function canExecuteStep(stepNumber, completedSteps) {
  // Can execute step if all previous steps are completed
  const requiredSteps = Array.from({ length: stepNumber - 1 }, (_, i) => i + 1);
  return requiredSteps.every(step => completedSteps.includes(step)) || stepNumber === 1;
}

/**
 * Get step description
 * @param {number} stepNumber
 * @returns {string}
 */
export function getStepDescription(stepNumber) {
  const descriptions = {
    1: 'Detecting and validating your GitHub repository',
    2: 'Allocating Fly.io machine resources',
    3: 'Configuring machine environment and settings',
    4: 'Cloning and booting your repository',
  };
  return descriptions[stepNumber] || 'Unknown step';
}

/**
 * Get next available step
 * @param {number[]} completedSteps
 * @returns {number}
 */
export function getNextStep(completedSteps) {
  for (let i = 1; i <= 4; i++) {
    if (!completedSteps.includes(i)) {
      return i;
    }
  }
  return 4; // All steps completed
}

/**
 * Check if setup is complete
 * @param {number[]} completedSteps
 * @returns {boolean}
 */
export function isSetupComplete(completedSteps) {
  return completedSteps.length === 4;
}

/**
 * Format error message for display
 * @param {unknown} error
 * @returns {string}
 */
export function formatErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
