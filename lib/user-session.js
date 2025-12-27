import { supabase, createClient } from './supabase';

const STORAGE_KEYS = {
  USER_ID: 'roseram_user_id',
  USER_DATA: 'roseram_user_data',
  CREDENTIALS: 'roseram_credentials',
  INTEGRATION_SETTINGS: 'roseram_integrations',
  FORM_INPUTS: 'roseram_form_inputs',
  PROJECT_CONFIG: 'roseram_projects',
  SERVICE_METADATA: 'roseram_service_metadata',
  LAST_SYNCED: 'roseram_last_synced',
};

/**
 * Extract unique identifier from service metadata or credentials
 */
export function extractServiceId(service, metadata) {
  if (!metadata) return null;

  switch (service) {
    case 'github':
      // Try to extract from metadata first
      if (metadata?.username || metadata?.id) {
        return metadata.username || metadata.id;
      }
      // Fall back to generating ID from token if available
      if (metadata?.github_token) {
        return `github_${metadata.github_token.substring(0, 12).toUpperCase()}`;
      }
      return null;

    case 'supabase':
      // Try to extract projectId from metadata first
      if (metadata?.projectId) {
        return metadata.projectId;
      }
      // Extract from URL if available
      if (metadata?.supabase_url) {
        const match = metadata.supabase_url.match(/https:\/\/([^.]+)\./);
        return match ? match[1] : null;
      }
      // Fall back to URL in metadata
      if (metadata?.url) {
        const match = metadata.url.match(/https:\/\/([^.]+)\./);
        return match ? match[1] : null;
      }
      return null;

    case 'netlify':
      // Try to extract from metadata first
      if (metadata?.accountId || metadata?.siteId) {
        return metadata.accountId || metadata.siteId;
      }
      // Generate ID from token if available
      if (metadata?.netlify_token) {
        return `netlify_${metadata.netlify_token.substring(0, 12)}`;
      }
      return null;

    default:
      return null;
  }
}

/**
 * Generate user ID from service data
 */
export function generateUserId(service, serviceId) {
  if (!service || !serviceId) return null;
  const timestamp = Date.now().toString(36);
  const hash = btoa(`${service}-${serviceId}`).substring(0, 12);
  return `${service}_${serviceId.substring(0, 8)}_${timestamp}`;
}

/**
 * Get current user session from localStorage
 */
export function getCurrentSession() {
  if (typeof window === 'undefined') return null;
  
  try {
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) return null;

    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    const serviceMetadata = localStorage.getItem(STORAGE_KEYS.SERVICE_METADATA);
    
    return {
      userId,
      userData: userData ? JSON.parse(userData) : {},
      serviceMetadata: serviceMetadata ? JSON.parse(serviceMetadata) : {},
    };
  } catch (error) {
    console.error('Failed to get current session:', error);
    return null;
  }
}

/**
 * Create or update user session
 */
export function createUserSession(service, serviceId, metadata) {
  if (typeof window === 'undefined') return null;

  try {
    const existingSession = getCurrentSession();
    
    // Generate new user ID if this is first service
    let userId = existingSession?.userId;
    if (!userId) {
      userId = generateUserId(service, serviceId);
    }

    const userData = {
      ...existingSession?.userData,
      createdAt: existingSession?.userData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      services: {
        ...(existingSession?.userData?.services || {}),
        [service]: {
          id: serviceId,
          connectedAt: new Date().toISOString(),
          metadata,
        },
      },
    };

    const serviceMetadata = {
      ...existingSession?.serviceMetadata,
      [service]: {
        id: serviceId,
        lastValidated: new Date().toISOString(),
        ...metadata,
      },
    };

    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.SERVICE_METADATA, JSON.stringify(serviceMetadata));

    return {
      userId,
      userData,
      serviceMetadata,
    };
  } catch (error) {
    console.error('Failed to create user session:', error);
    return null;
  }
}

/**
 * Save credentials securely to localStorage and optionally to Supabase
 */
export async function saveCredentials(credentials, syncToSupabase = false) {
  if (typeof window === 'undefined') return false;

  try {
    const session = getCurrentSession();
    if (!session?.userId) {
      console.error('No user session found');
      return false;
    }

    const encrypted = btoa(JSON.stringify(credentials)); // Basic encoding (consider better encryption for production)
    
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, encrypted);

    // Optionally sync to Supabase if connected
    if (syncToSupabase && credentials.supabase_url && credentials.supabase_anon_key) {
      try {
        const { error } = await supabase
          .from('user_sessions')
          .upsert({
            user_id: session.userId,
            credentials: encrypted,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (!error) {
          localStorage.setItem(STORAGE_KEYS.LAST_SYNCED, new Date().toISOString());
        }
      } catch (supabaseError) {
        console.warn('Failed to sync to Supabase:', supabaseError);
        // Don't fail - credentials are still saved locally
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to save credentials:', error);
    return false;
  }
}

/**
 * Get saved credentials from localStorage
 */
export function getCredentials() {
  if (typeof window === 'undefined') return null;

  try {
    const encrypted = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!encrypted) return null;

    return JSON.parse(atob(encrypted));
  } catch (error) {
    console.error('Failed to get credentials:', error);
    return null;
  }
}

/**
 * Save integration settings
 */
export function saveIntegrationSettings(settings) {
  if (typeof window === 'undefined') return false;

  try {
    const existing = localStorage.getItem(STORAGE_KEYS.INTEGRATION_SETTINGS);
    const current = existing ? JSON.parse(existing) : {};
    
    localStorage.setItem(
      STORAGE_KEYS.INTEGRATION_SETTINGS,
      JSON.stringify({ ...current, ...settings })
    );
    return true;
  } catch (error) {
    console.error('Failed to save integration settings:', error);
    return false;
  }
}

/**
 * Get saved integration settings
 */
export function getIntegrationSettings() {
  if (typeof window === 'undefined') return {};

  try {
    const data = localStorage.getItem(STORAGE_KEYS.INTEGRATION_SETTINGS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to get integration settings:', error);
    return {};
  }
}

/**
 * Save form inputs and preferences
 */
export function saveFormInputs(inputs) {
  if (typeof window === 'undefined') return false;

  try {
    const existing = localStorage.getItem(STORAGE_KEYS.FORM_INPUTS);
    const current = existing ? JSON.parse(existing) : {};
    
    localStorage.setItem(
      STORAGE_KEYS.FORM_INPUTS,
      JSON.stringify({
        ...current,
        ...inputs,
        lastUpdated: new Date().toISOString(),
      })
    );
    return true;
  } catch (error) {
    console.error('Failed to save form inputs:', error);
    return false;
  }
}

/**
 * Get saved form inputs
 */
export function getFormInputs() {
  if (typeof window === 'undefined') return {};

  try {
    const data = localStorage.getItem(STORAGE_KEYS.FORM_INPUTS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to get form inputs:', error);
    return {};
  }
}

/**
 * Save project configurations
 */
export function saveProjectConfig(config) {
  if (typeof window === 'undefined') return false;

  try {
    const existing = localStorage.getItem(STORAGE_KEYS.PROJECT_CONFIG);
    const configs = existing ? JSON.parse(existing) : [];
    
    const updatedConfigs = configs.filter(c => c.id !== config.id);
    updatedConfigs.push({
      ...config,
      savedAt: new Date().toISOString(),
    });
    
    localStorage.setItem(STORAGE_KEYS.PROJECT_CONFIG, JSON.stringify(updatedConfigs));
    return true;
  } catch (error) {
    console.error('Failed to save project config:', error);
    return false;
  }
}

/**
 * Get project configurations
 */
export function getProjectConfigs() {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECT_CONFIG);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get project configs:', error);
    return [];
  }
}

/**
 * Validate cached credentials
 */
export async function validateCredentials(credentials) {
  try {
    // Validate GitHub token
    if (credentials.github_token) {
      const githubResponse = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${credentials.github_token}` },
      });
      if (!githubResponse.ok) {
        console.warn('GitHub token is invalid or expired');
        return { valid: false, expiredService: 'github' };
      }
    }

    // Validate Supabase credentials
    if (credentials.supabase_url && credentials.supabase_anon_key) {
      const testSupabase = createClient(
        credentials.supabase_url,
        credentials.supabase_anon_key
      );
      const { error } = await testSupabase.from('projects').select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, which is fine
        console.warn('Supabase credentials are invalid or expired:', error);
        return { valid: false, expiredService: 'supabase' };
      }
    }

    // Validate Netlify token
    if (credentials.netlify_token) {
      const netlifyResponse = await fetch('https://api.netlify.com/api/v1/user', {
        headers: { Authorization: `Bearer ${credentials.netlify_token}` },
      });
      if (!netlifyResponse.ok) {
        console.warn('Netlify token is invalid or expired');
        return { valid: false, expiredService: 'netlify' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Failed to validate credentials:', error);
    return { valid: false, error };
  }
}

/**
 * Clear all user data
 */
export function clearUserSession() {
  if (typeof window === 'undefined') return;

  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear user session:', error);
  }
}

/**
 * Detect returning user by checking service metadata
 */
export async function detectReturningUser(newServiceData) {
  if (typeof window === 'undefined') return null;

  const currentSession = getCurrentSession();
  if (!currentSession?.serviceMetadata) return null;

  const serviceIds = Object.entries(newServiceData);
  
  for (const [service, metadata] of serviceIds) {
    const newServiceId = extractServiceId(service, metadata);
    const existingService = currentSession.serviceMetadata[service];
    
    if (existingService && newServiceId === existingService.id) {
      return {
        isReturningUser: true,
        userId: currentSession.userId,
        lastService: service,
        needsRevalidation: true,
      };
    }
  }

  return null;
}

/**
 * Merge user accounts if duplicate detected
 */
export function mergeUserAccounts(primarySession, secondaryMetadata) {
  if (typeof window === 'undefined') return null;

  try {
    const merged = {
      ...primarySession.userData,
      updatedAt: new Date().toISOString(),
      mergedServices: {
        ...(primarySession.userData.mergedServices || {}),
        [Object.keys(secondaryMetadata)[0]]: secondaryMetadata[Object.keys(secondaryMetadata)[0]],
      },
    };

    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.error('Failed to merge accounts:', error);
    return null;
  }
}
