'use client';

import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { DebugPreview } from './DebugPreview';

/**
 * Simple Auto Preview Component
 * Minimal UI - just shows loading and preview without overwhelming code
 */
export function SimpleAutoPreview({
  projectId,
  owner,
  repo,
  branch = 'main',
  onPreviewReady,
  onError,
}) {
  const { session } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, loading, ready, error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Start preview on mount
  useEffect(() => {
    if (!owner || !repo) return;
    // Access token is optional - preview can work without authentication
    console.log('[SimpleAutoPreview] Starting preview with:', { owner, repo, branch, authenticated: !!session?.access_token });
    startPreview();
  }, [session?.access_token, owner, repo]);

  // Track elapsed time during loading
  useEffect(() => {
    if (status !== 'loading') return;

    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const startPreview = async () => {
    if (status !== 'idle') return;

    setStatus('loading');
    setError(null);

    try {
      const generatedProjectId = projectId || `preview-${owner}-${repo}-${Date.now()}`;

      console.log('[SimpleAutoPreview] Starting preview for:', {
        owner,
        repo,
        branch,
        projectId: generatedProjectId
      });

      // Start preview
      console.log('[SimpleAutoPreview] Posting to /api/auto-preview...');
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/auto-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: generatedProjectId,
          owner,
          repo,
          branch,
        }),
      });

      console.log('[SimpleAutoPreview] POST response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: response.statusText };
        }
        throw new Error(errorData.error || `Failed to start preview (${response.status})`);
      }

      const postResult = await response.json();
      console.log('[SimpleAutoPreview] POST result:', postResult);

      // Poll for preview to be ready
      console.log('[SimpleAutoPreview] Starting polling for preview status...');
      await pollForPreview(generatedProjectId);
    } catch (err) {
      console.error('[SimpleAutoPreview] Error starting preview:', err);
      setStatus('error');
      setError(err.message || 'Failed to start preview');
      onError?.(err);
    }
  };

  const pollForPreview = async (generatedProjectId) => {
    const maxAttempts = 240; // 20 minutes with 5 second intervals
    let attempts = 0;
    let lastStatus = null;
    let notFoundCount = 0;
    const maxNotFoundAttempts = 10; // Allow up to 10 "not found" responses before giving up

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const headers = {};

        // Add authorization header if available
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/auto-preview?projectId=${generatedProjectId}`, {
          headers,
        });

        if (!response.ok) {
          console.warn(`[SimpleAutoPreview] Poll attempt ${attempts}: HTTP ${response.status}`);

          // If it's a 404, the preview record might not be created yet (race condition)
          // Try a few more times before giving up
          if (response.status === 404) {
            notFoundCount++;
            console.warn(`[SimpleAutoPreview] Preview not found (attempt ${notFoundCount}/${maxNotFoundAttempts}), retrying...`);

            if (notFoundCount > maxNotFoundAttempts) {
              const responseData = await response.json().catch(() => ({}));
              throw new Error(`Preview record not found after ${maxNotFoundAttempts} attempts. Details: ${responseData.details || responseData.error || 'Unknown error'}`);
            }

            // Continue polling for 404s but with a longer delay for early attempts
            const delayMs = notFoundCount <= 3 ? 2000 : 5000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }

          // Continue polling for other errors
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Reset not found count on successful response
        notFoundCount = 0;

        const data = await response.json();
        const preview = data.preview;

        const elapsedMinutes = Math.floor((attempts * 5) / 60);
        console.log(`[SimpleAutoPreview] Poll attempt ${attempts} (~${elapsedMinutes}min):`, {
          status: preview?.status,
          hasUrl: !!preview?.preview_url,
        });

        if (!preview) {
          throw new Error('No preview data in response');
        }

        lastStatus = preview.status;

        if (preview.status === 'running' && preview.preview_url) {
          console.log('[SimpleAutoPreview] Preview ready!', preview.preview_url);
          setPreviewUrl(preview.preview_url);
          setStatus('ready');
          onPreviewReady?.(preview);
          return;
        } else if (preview.status === 'error') {
          console.error('[SimpleAutoPreview] Preview error:', preview.error_message);
          throw new Error(preview.error_message || 'Preview failed to start');
        } else {
          // Still provisioning - continue polling
          console.debug(`[SimpleAutoPreview] Preview still ${preview.status}, polling again in 5s... (attempt ${attempts}/${maxAttempts})`);
        }
      } catch (err) {
        // Only throw on fatal errors, not on temporary network issues
        if (err.message.includes('not found after') || err.message.includes('No preview data')) {
          console.error('[SimpleAutoPreview] Fatal error:', err.message);
          throw err;
        }

        console.warn(`[SimpleAutoPreview] Poll attempt ${attempts} error:`, err.message);
      }

      // Wait before next attempt
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Timeout reached
    const timeoutMsg = `Preview startup timeout after ${maxAttempts} attempts (${Math.floor(maxAttempts * 5 / 60)} minutes). Last status: ${lastStatus || 'unknown'}. The repository dependencies or dev server setup may be taking too long.`;
    console.error('[SimpleAutoPreview]', timeoutMsg);
    throw new Error(timeoutMsg);
  };

  if (status === 'loading') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Loading Header */}
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2">
            <Loader className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-blue-900">Starting preview...</span>
          </div>
          <span className="text-xs text-blue-700 font-mono">{owner}/{repo} @ {branch}</span>
        </div>

        {/* Main Content - Always show diagnostics */}
        <div className="flex-1 overflow-auto">
          <DebugPreview owner={owner} repo={repo} branch={branch} elapsedSeconds={elapsedSeconds} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Error Header */}
        <div className="flex items-center justify-between p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-semibold text-red-900">Preview failed</span>
          </div>
          <button
            onClick={() => {
              setStatus('idle');
              setError(null);
              setElapsedSeconds(0);
            }}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
          >
            ← Try Again
          </button>
        </div>

        {/* Error Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-3">What went wrong</h3>
              <p className="text-gray-700 whitespace-pre-wrap text-sm mb-4 bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                {error}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm mb-4">
                <p className="text-blue-900 font-medium mb-2">Common causes:</p>
                <ul className="text-blue-800 text-xs space-y-1 list-disc list-inside">
                  <li>Repository branch doesn't exist or has typo</li>
                  <li>Repository dependencies are broken</li>
                  <li>Repository doesn't have a dev server script</li>
                  <li>Dev server takes longer than 2 minutes to start</li>
                  <li>GitHub token doesn't have proper permissions</li>
                </ul>
              </div>

              <div className="bg-gray-100 rounded p-4 text-left">
                <p className="text-xs text-gray-600 font-mono mb-2 font-semibold">Repository Info:</p>
                <p className="text-xs text-gray-700 font-mono">Owner: {owner}</p>
                <p className="text-xs text-gray-700 font-mono">Repo: {repo}</p>
                <p className="text-xs text-gray-700 font-mono">Branch: {branch}</p>
              </div>
            </div>

            {/* Show diagnostics to help debug */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Diagnostics</h3>
              <DebugPreview owner={owner} repo={repo} branch={branch} elapsedSeconds={elapsedSeconds} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ready' && previewUrl) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-3 bg-green-50 border-b border-green-200">
          <span className="text-sm text-green-800 font-semibold">Preview Ready</span>
          <button
            onClick={() => window.open(previewUrl, '_blank')}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </button>
        </div>
        <iframe
          src={previewUrl}
          className="flex-1 border-0"
          title="Preview"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
    );
  }

  return null;
}

export default SimpleAutoPreview;
