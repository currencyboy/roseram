'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader, RefreshCw, ExternalLink, Globe, CheckCircle, Copy, Info } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function UnifiedPreviewPanel({
  projectId,
  owner,
  repo,
  branch,
  githubToken,
  onPreviewReady,
  onError,
}) {
  const { session } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, detecting, spawning, running, error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [detectedScript, setDetectedScript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [instanceId, setInstanceId] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef(null);

  // REMOVED: Auto-trigger on mount. User must explicitly click "Launch Preview"

  const initializePreview = async () => {
    try {
      setStatus('spawning');
      setLoading(true);
      setError(null);
      setGuidance(null);

      // Use provided projectId or generate fallback
      const resolvedProjectId = projectId || `${owner}-${repo}`;
      console.log('[UnifiedPreviewPanel] Initializing preview with projectId:', resolvedProjectId);

      // Call the actual Fly.io deployment endpoint
      const response = await fetch(`/api/fly-preview?projectId=${resolvedProjectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setError(data.error || 'Failed to spawn preview instance');
        setGuidance(data.error === 'Fly.io is not configured. Preview deployment is not available.'
          ? 'Preview deployment requires Fly.io configuration. Contact an administrator.'
          : 'Please check your repository configuration and try again.');
        onError?.(data.error);
        return;
      }

      // Successfully created deployment
      setInstanceId(data.app.id);
      setPreviewUrl(data.app.previewUrl);
      setGuidance(`Preview deployment started. Current status: ${data.app.status}`);

      onPreviewReady?.({
        url: data.app.previewUrl,
        instanceId: data.app.id,
        status: data.app.status,
      });

      // Start polling for deployment completion
      pollDeploymentStatus(data.app.id, data.app.previewUrl);
    } catch (err) {
      setStatus('error');
      setError('Network error: ' + err.message);
      setGuidance('Check your connection and try again.');
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollDeploymentStatus = async (appId, previewUrl) => {
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes with 5s interval

    const pollInterval = setInterval(async () => {
      try {
        pollCount++;

        const response = await fetch(`/api/fly-preview?appId=${appId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            appId,
            action: 'status',
          }),
        });

        const data = await response.json();

        if (data.app) {
          setGuidance(`Status: ${data.app.status}. ${data.flyStatus?.deploymentStatus || ''}`);

          // Check if deployment is ready
          if (data.app.status === 'running' || data.flyStatus?.machineState === 'started') {
            setStatus('running');
            setIframeKey(prev => prev + 1);
            clearInterval(pollInterval);
            return;
          }
        }

        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          setStatus('running'); // Assume it's ready after 10 minutes
          setIframeKey(prev => prev + 1);
          setGuidance('Deployment initialization complete. If preview doesn\'t load, try refreshing.');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.warn('Status polling error:', err.message);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
    setGuidance(null);
    initializePreview();
  };

  const copyUrl = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
    }
  };

  // Detecting package.json
  if (status === 'detecting' && loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center max-w-md p-6">
          <div className="mb-4">
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Detecting Repository</h2>
          <p className="text-gray-600 text-sm">Checking for package.json and build configuration...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{error}</h3>
                {guidance && (
                  <p className="text-sm text-gray-600 mb-4">{guidance}</p>
                )}
              </div>
            </div>
            
            <div className="bg-amber-50 rounded p-3 mb-4 border border-amber-200">
              <h4 className="font-semibold text-amber-900 text-sm mb-2">How to Fix:</h4>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• Ensure your repository has a <code className="bg-white px-1 py-0.5 rounded">package.json</code></li>
                <li>• Add a <code className="bg-white px-1 py-0.5 rounded">"dev"</code> or <code className="bg-white px-1 py-0.5 rounded">"start"</code> script</li>
                <li>• Example: <code className="bg-white px-1 py-0.5 rounded text-xs">npm run dev</code></li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded font-medium text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Spawning instance
  if (status === 'spawning') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center max-w-md p-6">
          <div className="mb-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Spawning Preview Instance</h2>
          <p className="text-gray-600 text-sm mb-4">
            Starting your preview environment with: <code className="bg-green-100 px-2 py-1 rounded text-xs font-mono">{detectedScript}</code>
          </p>
          <div className="flex justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-green-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 animate-spin"></div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">This may take a moment...</p>
        </div>
      </div>
    );
  }

  // Running state
  if (status === 'running' && previewUrl) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-900">
        {/* URL Bar */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 bg-gray-900 rounded px-3 py-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={previewUrl}
              readOnly
              className="flex-1 bg-transparent text-gray-100 text-sm outline-none"
            />
          </div>
          <button
            onClick={copyUrl}
            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300"
            title="Copy URL"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Info Banner */}
        {detectedScript && (
          <div className="bg-blue-900/30 border-b border-blue-800/50 px-4 py-2 flex items-center gap-3 text-sm">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <p className="text-blue-200">
              Preview running <code className="bg-blue-900/50 px-2 py-0.5 rounded text-xs font-mono">{detectedScript}</code>
              {instanceId && (
                <span className="text-blue-300 ml-2">Instance: <code className="text-xs">{instanceId}</code></span>
              )}
            </p>
          </div>
        )}

        {/* Preview Frame */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={previewUrl}
          className="flex-1 w-full h-full border-0"
          title="Repository Preview"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
          onError={() => {
            setError('Failed to load preview');
            setStatus('error');
          }}
        />
      </div>
    );
  }

  // Idle state (before initialization)
  if (status === 'idle' && !loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Preview</h2>
          <p className="text-gray-600 mb-6">
            Your {repo} repository is ready to be previewed. Click below to start the instance.
          </p>
          <button
            onClick={initializePreview}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Launch Preview
          </button>
        </div>
      </div>
    );
  }

  return null;
}
