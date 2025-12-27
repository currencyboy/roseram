// API Configuration
export const API_CONFIG = {
  GROK_MODEL: 'grok-4',
  GROK_TEMPERATURE: 0.7,
  GROK_MAX_TOKENS: 2000,
  GROK_API_URL: 'https://api.x.ai/v1/chat/completions',
  REQUEST_TIMEOUT: 30000,
};

// Deployment Configuration
export const DEPLOYMENT_CONFIG = {
  GITHUB_API_URL: 'https://api.github.com',
  NETLIFY_API_URL: 'https://api.netlify.com/api/v1',
  GITHUB_BRANCH_DEFAULT: 'main',
  MAX_FILE_SIZE: 1024 * 1024,
};

// System Prompts for Grok
export const SYSTEM_PROMPTS = {
  CODE_GENERATION: `You are an expert web developer. Generate clean, modern HTML/CSS/JavaScript code based on user prompts.
Always structure your response with clearly marked code blocks:
- Use \`\`\`html for HTML code
- Use \`\`\`css for CSS styling  
- Use \`\`\`javascript for any JavaScript functionality

Make sure the code is production-ready, uses best practices, and includes proper accessibility features.`,

  ERROR_DEBUGGING: `You are an expert web developer debugging specialist. Analyze the provided error message and code, then provide:
1. A clear explanation of what went wrong
2. Specific fixes to resolve the issue
3. Prevention tips for the future

Be concise and actionable. Focus on practical solutions.`,

  PROMPT_ENHANCEMENT: `You are an expert at understanding user intent. When given a vague prompt, enhance it by:
1. Adding specific technical requirements
2. Suggesting best practices and features
3. Considering accessibility and performance
4. Recommending modern frameworks/libraries if applicable

Return an enhanced, detailed prompt that a developer could use.`,

  CODE_REVIEW: `You are a code review specialist. Analyze the provided code and suggest:
1. Performance improvements
2. Security vulnerabilities
3. Accessibility improvements
4. Best practice recommendations

Be specific with line numbers when referencing code.`,

  DEPENDENCY_SUGGESTION: `You are a web development expert. Based on the requirements or code provided, suggest:
1. Required npm packages
2. Framework recommendations
3. Build tool suggestions
4. Testing frameworks

Provide installation commands and brief explanations.`,
};

// User Session
export const SESSION_CONFIG = {
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  TOKEN_REFRESH_INTERVAL: 60 * 60 * 1000,
};

// UI Configuration
export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 300,
};

// Error Messages
export const ERROR_MESSAGES = {
  MISSING_API_KEY: 'API key not configured. Please check environment variables.',
  INVALID_PROMPT: 'Prompt cannot be empty.',
  GENERATION_FAILED: 'Failed to generate code. Please try again.',
  AUTH_FAILED: 'Authentication failed. Please check your credentials.',
  DEPLOYMENT_FAILED: 'Deployment failed. Please check your settings.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_INPUT: 'Invalid input provided.',
  UNAUTHORIZED: 'Unauthorized access.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  CODE_GENERATED: 'Code generated successfully!',
  CODE_UPDATED: 'Code updated successfully!',
  DEPLOYED_SUCCESS: 'Deployed successfully!',
  PROJECT_CREATED: 'Project created successfully!',
  PROJECT_SAVED: 'Project saved successfully!',
  SETTINGS_UPDATED: 'Settings updated successfully!',
};

// Feature Flags
export const FEATURES = {
  ENABLE_CHAT_HISTORY: true,
  ENABLE_PROJECT_VERSIONING: true,
  ENABLE_REAL_TIME_COLLAB: false,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_MONITORING: true,
};

// Validation Rules
export const VALIDATION = {
  MIN_PROJECT_NAME: 3,
  MAX_PROJECT_NAME: 100,
  MIN_PROMPT_LENGTH: 10,
  MAX_PROMPT_LENGTH: 10000,
  MIN_PASSWORD_LENGTH: 8,
  ALLOWED_FILE_EXTENSIONS: ['.html', '.css', '.js', '.json', '.ts', '.tsx'],
};
