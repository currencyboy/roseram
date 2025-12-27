'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader, AlertCircle, Globe, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { fetchPreviewConfig, createOrGetPreview, pollPreviewStatus } from '@/lib/preview-sync-service';

/**
 * Synced Fly Preview Component
 * Loads preview URL from Status tab (currentBranch, repository)
 * and displays the running Fly.io preview
 */
export function SyncedFlyPreview({
  projectId,
  currentBranch,
  repository,
  onStatusChange,
  onError,
}) {
  const { session, loading: authLoading } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing preview...');

  // Load or create preview config
  const initializePreview = useCallback(async () => {
    console.log('[SyncedFlyPreview] initializePreview called with:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      authLoading,
      projectId,
      currentBranch,
      repository,
    });

    // Wait for auth to load if still loading
    if (authLoading) {
      console.warn('[SyncedFlyPreview] Auth still loading, deferring preview initialization');
      setStatusMessage('Waiting for authentication...');
      return;
    }

    if (!session) {
      const errorMsg = 'Not authenticated - please sign in to access previews';
      console.error('[SyncedFlyPreview]', errorMsg);
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    if (!session?.access_token) {
      const errorMsg = 'Not authenticated - missing access token. Please sign in again.';
      console.error('[SyncedFlyPreview]', errorMsg);
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    if (!projectId || !currentBranch || !repository) {
      const errorMsg = `Missing required data: projectId=${!!projectId}, currentBranch=${!!currentBranch}, repository=${!!repository}`;
      console.error('[SyncedFlyPreview]', errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Loading preview configuration...');

      // Format repo as owner/repo
      const repoString = `${currentBranch.owner}/${currentBranch.repo}`;

      // Try to create or get preview
      console.log('[SyncedFlyPreview] Calling createOrGetPreview with:', {
        projectId,
        repo: repoString,
        branch: currentBranch.name,
        apiOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
      });

      const newConfig = await createOrGetPreview(
        projectId,
        repoString,
        currentBranch.name,
        session.access_token
      );

      if (!newConfig) {
        throw new Error('Failed to create or retrieve preview - API returned null');
      }

      setConfig(newConfig);
      console.log('[SyncedFlyPreview] Preview config loaded successfully:', newConfig);

      // If status is not running yet, poll for it
      if (newConfig.status !== 'running' && newConfig.status !== 'error') {
        setPolling(true);
        setStatusMessage('Building and deploying to Fly.io...');

        console.log('[SyncedFlyPreview] Starting poll for preview status:', newConfig.status);

        const polledConfig = await pollPreviewStatus(projectId, session.access_token, 120, 5000); // 10 minutes max

        if (polledConfig) {
          setConfig(polledConfig);
          console.log('[SyncedFlyPreview] Poll result:', polledConfig.status);

          if (polledConfig.status === 'running') {
            setStatusMessage('Preview is ready!');
            setPreviewReady(true);
          } else if (polledConfig.status === 'error') {
            setError(polledConfig.errorMessage || 'Preview deployment failed');
            onError?.(polledConfig.errorMessage);
          } else {
            // Timeout - still pending, but assume app will be ready soon
            console.warn('[SyncedFlyPreview] Poll timeout, assuming preview will be ready soon');
            setStatusMessage('Preview is starting up...');
            setPreviewReady(true);
          }
        } else {
          setError('Failed to poll preview status');
          onError?.('Failed to poll preview status');
        }
        setPolling(false);
      } else if (newConfig.status === 'running') {
        setStatusMessage('Preview is ready!');
        setPreviewReady(true);
      } else if (newConfig.status === 'error') {
        setError(newConfig.errorMessage || 'Preview deployment failed');
        onError?.(newConfig.errorMessage);
      }

      onStatusChange?.(newConfig);
    } catch (err) {
      console.error('[SyncedFlyPreview] Error initializing preview:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        type: err instanceof TypeError ? 'TypeError (Network Issue)' : typeof err,
      });

      let errorMsg = 'Failed to initialize preview';

      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        errorMsg = 'Network error: Unable to reach API endpoint. Check your connection and CORS settings.';
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentBranch, repository, session, authLoading, onStatusChange, onError]);

  // Initialize on mount or when dependencies change
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) {
      console.log('[SyncedFlyPreview] Waiting for auth to load...');
      return;
    }

    // Only initialize if we have required props and a session
    if (projectId && currentBranch && repository && session?.access_token) {
      initializePreview();
    }
  }, [initializePreview, authLoading, projectId, currentBranch, repository, session]);

  // Refresh preview
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setStatusMessage('Refreshing preview...');
    setPreviewReady(false);
    await initializePreview();
  }, [initializePreview]);

  // Loading state
  if (loading || polling || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {authLoading ? 'Verifying authentication...' : statusMessage}
        </p>
        {!authLoading && currentBranch?.name && (
          <p className="text-sm text-gray-600">
            Branch: {currentBranch.name}
          </p>
        )}
        {config?.previewUrl && (
          <div className="mt-4 p-3 bg-white rounded-lg max-w-md">
            <p className="text-xs text-gray-700">
              <strong>Preview URL:</strong>
            </p>
            <a
              href={config.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {config.previewUrl}
            </a>
            <p className="text-xs text-gray-500 mt-2">
              Status: <span className="font-medium">{config.status || 'initializing'}</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.includes('authenticated') || error.includes('access token');

    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-50 p-6">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-lg font-medium text-red-900 mb-2">
          {isAuthError ? 'Authentication Required' : 'Preview Error'}
        </p>
        <p className="text-sm text-red-700 text-center mb-4 max-w-md">{error}</p>
        {isAuthError ? (
          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-red-600 mb-2">Please sign in to use previews</p>
            <button
              onClick={() => window.location.href = '/auth'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // Preview ready - show iframe
  if (previewReady && config?.previewUrl) {
    console.log('[SyncedFlyPreview] Rendering preview iframe:', {
      url: config.previewUrl,
      status: config.status,
    });

    return (
      <div className="flex flex-col h-full">
        {/* Preview toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Fly.io Preview</span>
            <span className="text-xs bg-blue-500 px-2 py-1 rounded">
              {config.status || 'running'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-blue-500 rounded transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href={config.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-blue-500 rounded transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Preview iframe */}
        <iframe
          key={config.previewUrl}
          src={config.previewUrl}
          className="flex-1 w-full border-0"
          title="Preview"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
          onLoad={() => {
            console.log('[SyncedFlyPreview] Preview iframe loaded successfully');
          }}
          onError={(error) => {
            console.error('[SyncedFlyPreview] Preview iframe error:', error);
          }}
        />

        {/* Footer info */}
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-600">
          <p>
            Preview URL:{' '}
            <a
              href={config.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {config.previewUrl}
            </a>
          </p>
          <p className="mt-1 text-gray-500">
            {currentBranch?.owner}/{currentBranch?.repo} • {currentBranch?.name}
          </p>
        </div>
      </div>
    );
  }

  // Not ready state
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
      <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium text-gray-700 mb-2">Preview Not Ready</p>
      <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
        The preview is being initialized. Please wait or refresh.
      </p>
      <button
        onClick={handleRefresh}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </button>
    </div>
  );
}

export default SyncedFlyPreview;
