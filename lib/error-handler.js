/**
 * Detects and enhances error messages with actionable guidance
 */

export const ErrorTypes = {
  GITHUB_PERMISSION: 'github_permission',
  GITHUB_TOKEN_MISSING: 'github_token_missing',
  WORKFLOW_NOT_FOUND: 'workflow_not_found',
  INVALID_WORKFLOW: 'invalid_workflow',
  FLY_IO_ERROR: 'fly_io_error',
  REPOSITORY_ERROR: 'repository_error',
  DEPLOYMENT_TIMEOUT: 'deployment_timeout',
  UNKNOWN: 'unknown',
};

export function detectErrorType(error, details = '') {
  const errorStr = `${error}${details}`.toLowerCase();

  if (
    errorStr.includes('permission denied') ||
    errorStr.includes('not accessible') ||
    errorStr.includes('token') && errorStr.includes('scope')
  ) {
    return ErrorTypes.GITHUB_PERMISSION;
  }

  if (errorStr.includes('github token') && errorStr.includes('not configured')) {
    return ErrorTypes.GITHUB_TOKEN_MISSING;
  }

  if (
    errorStr.includes('workflow file not found') ||
    errorStr.includes('404') && errorStr.includes('workflow')
  ) {
    return ErrorTypes.WORKFLOW_NOT_FOUND;
  }

  if (
    errorStr.includes('invalid workflow') ||
    errorStr.includes('validation failed')
  ) {
    return ErrorTypes.INVALID_WORKFLOW;
  }

  if (errorStr.includes('fly') || errorStr.includes('timeout')) {
    return ErrorTypes.FLY_IO_ERROR;
  }

  if (errorStr.includes('repository') || errorStr.includes('repo')) {
    return ErrorTypes.REPOSITORY_ERROR;
  }

  return ErrorTypes.UNKNOWN;
}

export function getErrorGuidance(errorType, errorDetails = '') {
  const guides = {
    [ErrorTypes.GITHUB_PERMISSION]: {
      title: 'GitHub Token Permissions Insufficient',
      problem: 'Your GitHub token does not have permission to trigger workflows.',
      solution: [
        {
          step: '1. Create a new GitHub Personal Access Token',
          link: 'https://github.com/settings/tokens/new',
          instructions: [
            'Go to GitHub Settings → Developer settings → Personal access tokens',
            'Click "Generate new token"',
            'Give it a descriptive name (e.g., "Roseram Deployment")',
          ],
        },
        {
          step: '2. Grant these required scopes',
          instructions: [
            '✓ repo (Full control of private repositories)',
            '✓ workflow (Update GitHub Action workflows)',
            '✓ read:org (Read organization data)',
          ],
        },
        {
          step: '3. Update your token',
          instructions: [
            'Copy the new token',
            'Reconnect your GitHub account in the integration settings',
            'Try deploying again',
          ],
        },
      ],
    },
    [ErrorTypes.GITHUB_TOKEN_MISSING]: {
      title: 'GitHub Token Not Configured',
      problem: 'The server is missing GitHub credentials.',
      solution: [
        {
          step: '1. Contact your administrator',
          instructions: [
            'GitHub token must be configured on the server',
            'Share your repository URL and branch',
            'Ask them to set up the GitHub token with proper permissions',
          ],
        },
      ],
    },
    [ErrorTypes.WORKFLOW_NOT_FOUND]: {
      title: 'Deployment Workflow Not Found',
      problem:
        'The GitHub Actions workflow file (.github/workflows/deploy-preview.yml) does not exist in your repository.',
      solution: [
        {
          step: '1. Check your repository structure',
          instructions: [
            'Ensure your repository has a .github/workflows/ directory',
            'Verify that deploy-preview.yml exists in that directory',
            'The workflow file should be in the branch you are deploying',
          ],
        },
        {
          step: '2. Create the workflow if missing',
          instructions: [
            'Create .github/workflows/deploy-preview.yml in your repository',
            'Add the necessary GitHub Actions workflow configuration',
            'Push the changes to the branch you want to deploy',
          ],
        },
      ],
    },
    [ErrorTypes.INVALID_WORKFLOW]: {
      title: 'Invalid Workflow Configuration',
      problem:
        'The GitHub Actions workflow has invalid configuration or inputs.',
      solution: [
        {
          step: '1. Review your workflow file',
          instructions: [
            'Check .github/workflows/deploy-preview.yml for syntax errors',
            'Ensure all workflow inputs match the deployment inputs',
            'Verify the workflow is properly formatted YAML',
          ],
        },
        {
          step: '2. Common issues',
          instructions: [
            'Missing required workflow inputs',
            'Invalid YAML syntax',
            'Incorrect trigger configuration',
          ],
        },
      ],
    },
    [ErrorTypes.FLY_IO_ERROR]: {
      title: 'Fly.io Deployment Error',
      problem: errorDetails || 'An error occurred during Fly.io deployment.',
      solution: [
        {
          step: '1. Check deployment logs',
          instructions: [
            'Visit https://fly.io/dashboard to check your deployment',
            'Review the logs for specific error messages',
            'Ensure your app is configured correctly',
          ],
        },
        {
          step: '2. Try again',
          instructions: [
            'Wait a moment and retry the deployment',
            'Check that all required files are committed',
            'Verify your Fly.io account is in good standing',
          ],
        },
      ],
    },
    [ErrorTypes.REPOSITORY_ERROR]: {
      title: 'Repository Error',
      problem: 'Could not access or validate your GitHub repository.',
      solution: [
        {
          step: '1. Verify repository access',
          instructions: [
            'Ensure the repository exists and is accessible',
            'Check that your GitHub token has permission to access it',
            'Try reconnecting GitHub',
          ],
        },
      ],
    },
    [ErrorTypes.UNKNOWN]: {
      title: 'Deployment Error',
      problem: errorDetails || 'An unexpected error occurred during deployment.',
      solution: [
        {
          step: 'Troubleshooting steps',
          instructions: [
            '1. Try deploying again',
            '2. Check all integrations are properly connected',
            '3. Verify your repository and branch are correct',
            '4. Contact support if the issue persists',
          ],
        },
      ],
    },
  };

  return guides[errorType] || guides[ErrorTypes.UNKNOWN];
}

export function formatErrorMessage(error, details = '') {
  const errorType = detectErrorType(error, details);
  const guidance = getErrorGuidance(errorType, details);
  return {
    type: errorType,
    ...guidance,
  };
}
