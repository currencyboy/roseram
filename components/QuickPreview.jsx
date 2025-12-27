'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader, AlertCircle, Globe, RefreshCw, ExternalLink, Copy, Check, Zap, Play } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { PreviewTerminal } from './PreviewTerminal';

/**
 * Quick Preview Component (Sprites Edition)
 * 
 * Boots Sprites sandbox instantly
 * Features:
 * - Instant boot with Sprites
 * - Real-time status polling
 * - Direct iframe embedding
 * - Copy URL to clipboard
 * - Responsive design
 */
export function QuickPreview({
  projectId,
  currentBranch,
  repository,
  onUrlReady,
  onError,
}) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [spriteName, setSpriteName] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('launching');
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Manual start of preview
  const handleStartPreview = async () => {
    // Generate temporary projectId if not provided
    let effectiveProjectId = projectId;
    if (!effectiveProjectId) {
      effectiveProjectId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.warn('[QuickPreview] No projectId provided, using temporary:', effectiveProjectId);
    }

    console.log('[QuickPreview] Session info:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
    });

    console.log('[QuickPreview] Proceeding with preview launch (auth optional)');

    if (!currentBranch) {
      const msg = 'No branch selected or created yet';
      console.warn('[QuickPreview] Configuration error:', msg);
      setError(msg);
      onError?.(msg);
      setLoading(false);
      return;
    }

    if (!currentBranch.owner || !currentBranch.repo || !currentBranch.name) {
      const msg = 'Branch information is incomplete (missing owner, repo, or name)';
      console.error('[QuickPreview] Invalid branch data:', currentBranch);
      setError(msg);
      onError?.(msg);
      setLoading(false);
      return;
    }

    if (!repository) {
      const msg = 'Repository information not available';
      console.warn('[QuickPreview] Configuration error:', msg);
      setError(msg);
      onError?.(msg);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setStatus('launching');
      setProgress(10);

      const repoString = `${currentBranch.owner}/${currentBranch.repo}`;
      const branchName = currentBranch.name;

      console.log('[QuickPreview] Launching Sprites sandbox', {
        projectId: effectiveProjectId,
        repo: repoString,
        branch: branchName,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
      });

      // Launch the Sprites preview via API
      console.log('[QuickPreview] Fetching /api/sprites-preview with:', {
        projectId: effectiveProjectId,
        repo: repoString,
        branch: branchName,
      });

      const headers = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/sprites-preview?projectId=${effectiveProjectId}&repo=${repoString}&branch=${branchName}`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[QuickPreview] API response status:', response.status);

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (jsonErr) {
          console.warn('[QuickPreview] Could not parse error response as JSON');
        }
        const errorMsg = errorData.error || `Failed to launch preview (${response.status} ${response.statusText})`;
        console.error('[QuickPreview] API error:', { status: response.status, errorMsg, errorData });
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('[QuickPreview] API response data:', data);

      if (!data.sprite) {
        throw new Error('No sprite data returned from API');
      }

      setSpriteName(data.sprite.spriteName);
      setProgress(20);

      console.log('[QuickPreview] Sprite created', {
        spriteName: data.sprite.spriteName,
        status: data.sprite.status,
      });

      // If sprite is already running, construct URL and finish
      if (data.sprite.status === 'running' && data.sprite.spriteName) {
        const url = `https://${data.sprite.spriteName}.sprites.dev`;
        setPreviewUrl(url);
        setStatus('running');
        setProgress(100);
        setLoading(false);
        onUrlReady?.(url);
        console.log('[QuickPreview] Sprite ready immediately:', url);
        return;
      }

      // Start polling for sprite readiness
      startPolling(data.sprite.id, data.sprite.spriteName);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[QuickPreview] Launch error:', {
        error: errorMsg,
        currentBranch,
        projectId: effectiveProjectId,
        stack: err instanceof Error ? err.stack : 'no stack',
        errorType: err?.constructor?.name,
      });

      // Show user-friendly error message
      let userMessage = errorMsg;
      if (errorMsg.includes('Failed to launch preview')) {
        userMessage = 'Unable to reach preview API. Check your connection or try again.';
      } else if (errorMsg.includes('authentication') || errorMsg.includes('auth')) {
        userMessage = 'Authentication failed. Please sign in again.';
      }

      setError(userMessage);
      onError?.(userMessage);
      setLoading(false);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for sprite status
  const startPolling = (spriteId, spriteName) => {
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes with 5-second intervals

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;

      try {
        // Poll for sprite status using POST with spriteId in body
        const pollHeaders = {
          'Content-Type': 'application/json',
        };

        // Add authorization header if available
        if (session?.access_token) {
          pollHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }

        const statusResponse = await fetch(
          `/api/sprites-preview`,
          {
            method: 'POST',
            headers: pollHeaders,
            body: JSON.stringify({
              spriteId: spriteId,
              action: 'status',
            }),
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const spriteStatus = statusData.sprite?.status;

          if (spriteStatus === 'running') {
            const url = `https://${spriteName}.sprites.dev`;
            setPreviewUrl(url);
            setStatus('running');
            setProgress(100);
            setLoading(false);
            clearInterval(pollIntervalRef.current);
            onUrlReady?.(url);
            console.log('[QuickPreview] Sprite ready!', { spriteName, elapsed: elapsedSeconds });
            return;
          }

          if (spriteStatus === 'pending' || spriteStatus === 'provisioning') {
            setStatus('provisioning');
            setProgress(Math.min(90, 20 + pollCount * 2));
          }

          if (spriteStatus === 'error') {
            throw new Error(statusData.sprite?.errorMessage || 'Sprite failed to provision');
          }

          console.log('[QuickPreview] Status poll', {
            pollCount,
            spriteStatus,
            elapsed: elapsedSeconds,
          });
        } else {
          console.warn('[QuickPreview] Status check returned', statusResponse.status);
        }
      } catch (pollErr) {
        console.warn('[QuickPreview] Poll error:', pollErr.message);
      }

      // Timeout after max polls - assume it's ready
      if (pollCount >= maxPolls) {
        clearInterval(pollIntervalRef.current);
        // Construct URL and assume sprite is ready
        if (spriteName) {
          const url = `https://${spriteName}.sprites.dev`;
          setPreviewUrl(url);
          setStatus('running');
          setProgress(100);
          setLoading(false);
          onUrlReady?.(url);
          console.warn('[QuickPreview] Poll timeout after', maxPolls, 'attempts, assuming sprite is ready');
        }
      }
    }, 5000);
  };

  // Copy URL to clipboard
  const handleCopy = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Refresh/restart preview
  const handleRefresh = () => {
    setPreviewUrl(null);
    setSpriteName(null);
    setError(null);
    setStatus('launching');
    setProgress(0);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  // Loading/provisioning state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-blue-25 to-indigo-100">
        {/* Main loading area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center gap-6 max-w-md">
            {/* Animated loading icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-200 rounded-full opacity-20 animate-ping" />
              <Zap className="w-16 h-16 text-blue-600 relative z-10" />
            </div>

            {/* Status text */}
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900 mb-1">
                Launching Preview
              </p>
              <p className="text-sm text-gray-600">
                {status === 'launching' && 'Starting Sprites sandbox...'}
                {status === 'provisioning' && 'Provisioning environment...'}
                {status === 'running' && 'Preview ready!'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Sprite info */}
            {spriteName && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 w-full">
                <p className="text-xs text-gray-600">
                  <strong>Sprite:</strong> {spriteName}
                </p>
              </div>
            )}

            {/* Cancel button */}
            <button
              onClick={() => {
                setLoading(false);
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                }
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Terminal at bottom */}
        <PreviewTerminal isVisible={true} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full bg-red-50">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 max-w-md">
            <AlertCircle className="w-12 h-12 text-red-600" />
            <div className="text-center">
              <p className="text-lg font-semibold text-red-900 mb-2">
                Preview Failed
              </p>
              <p className="text-sm text-red-700 mb-4">
                {error}
              </p>
              <p className="text-xs text-red-600 mb-6 bg-red-100 p-3 rounded border border-red-300 text-left max-h-40 overflow-y-auto font-mono">
                Check the terminal below for full details. You can scroll up to see all API calls and logs.
              </p>
            </div>
            <button
              onClick={handleStartPreview}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>

        {/* Terminal showing full details */}
        <PreviewTerminal isVisible={true} />
      </div>
    );
  }

  // Initial state - ready to start
  if (!previewUrl) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center gap-6 max-w-md">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-200 rounded-full opacity-20" />
              <Zap className="w-16 h-16 text-blue-600 relative z-10" />
            </div>

            {/* Title and description */}
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Preview
              </p>
              <p className="text-sm text-gray-600">
                Start your Sprites sandbox to see your application live
              </p>
            </div>

            {/* Repository info */}
            {currentBranch && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 w-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    <strong>Repository:</strong>
                  </span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {currentBranch.owner}/{currentBranch.repo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    <strong>Branch:</strong>
                  </span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {currentBranch.name}
                  </span>
                </div>
              </div>
            )}

            {/* Start button */}
            <button
              onClick={handleStartPreview}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <Play className="w-5 h-5" />
              Start Preview
            </button>

            {/* Help text */}
            <p className="text-xs text-gray-500 text-center">
              This will launch a Sprites sandbox and display your application in the preview area.
              Check the terminal below to monitor activity.
            </p>
          </div>
        </div>

        {/* Terminal at bottom */}
        <PreviewTerminal isVisible={true} />
      </div>
    );
  }

  // Preview ready - show iframe
  if (previewUrl) {
    return (
      <div className="flex flex-col h-full">
        {/* Preview toolbar */}
        <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Sprites Preview</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Running
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>

            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600" />
              )}
            </button>

            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4 text-gray-600" />
            </a>
          </div>
        </div>

        {/* Split view: Preview + Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview iframe */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
              onError={() => {
                console.error('[QuickPreview] iframe error');
              }}
            />
          </div>

          {/* Terminal at bottom */}
          <PreviewTerminal isVisible={true} />
        </div>

        {/* Preview URL display */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <p className="text-xs text-gray-600">
            Preview URL:{' '}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono"
            >
              {previewUrl}
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Not ready state
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-6">
      <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium text-gray-700 mb-2">Preview Not Ready</p>
      <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
        The preview is being initialized. Please wait or refresh the page.
      </p>
    </div>
  );
}

export default QuickPreview;
