/**
 * Preview Sync Service
 * Fetches preview configurations from SQL and manages preview lifecycle
 */

export interface PreviewConfig {
  id: string;
  projectId: string;
  appName: string;
  previewUrl: string;
  status: 'pending' | 'initializing' | 'running' | 'stopped' | 'error';
  errorMessage?: string;
  repository?: string;
  branch?: string;
}

export interface BranchInfo {
  name: string;
  owner: string;
  repo: string;
  url?: string;
}

/**
 * Get the correct API base URL
 * Handles cases where we're in an iframe or different domain
 */
function getApiBaseUrl(): string {
  // If we're in a browser environment
  if (typeof window === 'undefined') {
    return '';
  }

  // Use window.location.origin to get the current domain
  // This ensures we call the API on the same domain the app is running on
  return window.location.origin;
}

/**
 * Construct absolute API URL
 */
function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return endpoint; // Fallback to relative URL
  }

  // Remove leading slash if present to avoid double slashes
  const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return `${baseUrl}${path}`;
}

export async function fetchPreviewConfig(
  projectId: string,
  accessToken: string
): Promise<PreviewConfig | null> {
  try {
    const url = getApiUrl(`/api/fly-preview?projectId=${encodeURIComponent(projectId)}`);

    console.log('[PreviewSync] Fetching preview config from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[PreviewSync] Failed to fetch preview config:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.app) {
      console.warn('[PreviewSync] Invalid preview config response:', data);
      return null;
    }

    console.log('[PreviewSync] Preview config fetched successfully:', data.app);

    return {
      id: data.app.id,
      projectId: data.app.projectId,
      appName: data.app.appName,
      previewUrl: data.app.previewUrl,
      status: data.app.status,
      errorMessage: data.app.errorMessage,
    };
  } catch (error) {
    console.error('[PreviewSync] Error fetching preview config:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export async function createOrGetPreview(
  projectId: string,
  repo: string, // format: owner/repo
  branch: string,
  accessToken: string
): Promise<PreviewConfig | null> {
  try {
    const queryParams = new URLSearchParams({
      projectId,
      repo,
      branch,
    });

    const url = getApiUrl(`/api/fly-preview?${queryParams.toString()}`);

    console.log('[PreviewSync] Creating/getting preview:', {
      url,
      projectId,
      repo,
      branch,
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[PreviewSync] Failed to create/get preview:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.app) {
      console.warn('[PreviewSync] Invalid preview response:', data);
      return null;
    }

    console.log('[PreviewSync] Preview created/retrieved successfully:', {
      appName: data.app.appName,
      status: data.app.status,
      previewUrl: data.app.previewUrl,
      reused: data.reused,
    });

    return {
      id: data.app.id,
      projectId: data.app.projectId,
      appName: data.app.appName,
      previewUrl: data.app.previewUrl,
      status: data.app.status,
      errorMessage: data.app.errorMessage,
      repository: repo,
      branch: branch,
    };
  } catch (error) {
    console.error('[PreviewSync] Error creating/getting preview:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export async function pollPreviewStatus(
  projectId: string,
  accessToken: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<PreviewConfig | null> {
  let attempts = 0;

  console.log('[PreviewSync] Starting status poll:', {
    projectId,
    maxAttempts,
    intervalMs,
  });

  return new Promise((resolve) => {
    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const config = await fetchPreviewConfig(projectId, accessToken);

        if (!config) {
          console.warn('[PreviewSync] Failed to fetch status on attempt', attempts);
          if (attempts >= maxAttempts) {
            console.warn('[PreviewSync] Poll max attempts reached');
            clearInterval(pollInterval);
            resolve(null);
          }
          return;
        }

        console.log('[PreviewSync] Poll attempt', attempts, '- Status:', config.status);

        // If running or error, stop polling
        if (config.status === 'running' || config.status === 'error') {
          console.log('[PreviewSync] Poll completed with status:', config.status);
          clearInterval(pollInterval);
          resolve(config);
          return;
        }

        // Continue polling if pending or initializing
        if (attempts >= maxAttempts) {
          console.warn('[PreviewSync] Poll max attempts reached, returning last config');
          clearInterval(pollInterval);
          resolve(config);
        }
      } catch (error) {
        console.error('[PreviewSync] Polling error on attempt', attempts, ':', error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          resolve(null);
        }
      }
    }, intervalMs);
  });
}

export function generatePreviewId(userId: string, projectId: string): string {
  return `preview-${userId}-${projectId}`;
}

export function formatPreviewBranch(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 20);
}
