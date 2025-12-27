// Enterprise configuration for Roseram
export const ENTERPRISE_CONFIG = {
  domain: process.env.ROSERAM_DOMAIN || "roseram.com",
  environment: process.env.NODE_ENV || "development",
  enterprise: {
    name: "Roseram",
    supportEmail: "support@roseram.com",
    apiUrl: `https://${process.env.ROSERAM_DOMAIN || "roseram.com"}/api`,
  },
  features: {
    mcp_integrations,
    team_management,
    billing_tracking,
    code_generation,
    repository_management,
    custom_domains,
  },
  limits: {
    max_team_members: parseInt(process.env.MAX_TEAM_MEMBERS || "50"),
    max_projects: parseInt(process.env.MAX_PROJECTS || "unlimited"),
    daily_token_limit: parseInt(process.env.DAILY_TOKEN_LIMIT || "1000000"),
  },
};

// Environment variables with no restrictions
export const getAllowedEnvVars = () => {
  return {
    // Supabase
    SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL,
    SUPABASE_ANON: process.env.SUPABASE_ANON,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    
    // X API (Grok)
    X_API_KEY: process.env.X_API_KEY,
    
    // Netlify
    VITE_NETLIFY_ACCESS_TOKEN: process.env.VITE_NETLIFY_ACCESS_TOKEN,
    VITE_NETLIFY_SITE_ID: process.env.VITE_NETLIFY_SITE_ID,
    
    // GitHub
    GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
    
    // Admin
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    
    // Custom
    ROSERAM_DOMAIN: process.env.ROSERAM_DOMAIN,
    MAX_TEAM_MEMBERS: process.env.MAX_TEAM_MEMBERS,
    MAX_PROJECTS: process.env.MAX_PROJECTS,
    DAILY_TOKEN_LIMIT: process.env.DAILY_TOKEN_LIMIT,
  };
};

export const validateEnvVars = () => {
  const required = [
    "SUPABASE_PROJECT_URL",
    "SUPABASE_ANON",
    "SUPABASE_SERVICE_ROLE",
    "X_API_KEY",
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(", ")}`);
  }
  
  return missing.length === 0;
};
