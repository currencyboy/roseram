'use client';

import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

/**
 * Instant Preview Component
 * Loads the already-running Fly.io deployment directly
 * No container spinning up = instant preview (like Builder.io)
 */
export function InstantPreview({
  owner,
  repo,
  branch = 'main',
  onError,
}) {
  const [status, setStatus] = useState('loading'); // loading, ready, error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!owner || !repo) return;
    
    // For instant preview, use your existing Fly.io deployment
    // Get the deployment URL from environment or directly use it
    const deploymentUrl = process.env.NEXT_PUBLIC_FLY_DEPLOYMENT_URL || 
                         `https://${owner}-${repo}.fly.dev`;
    
    console.log('[InstantPreview] Loading preview:', { owner, repo, url: deploymentUrl });
    
    // Check if deployment is accessible
    checkDeploymentHealth(deploymentUrl);
  }, [owner, repo]);

  const checkDeploymentHealth = async (url) => {
    try {
      setStatus('loading');
      setError(null);

      // Use server-side health check to avoid CORS issues
      const healthCheckUrl = `/api/health-check?url=${encodeURIComponent(url)}`;

      const response = await fetch(healthCheckUrl, {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Health check endpoint error');
      }

      if (result.healthy) {
        setPreviewUrl(url);
        setStatus('ready');
        console.log('[InstantPreview] Preview ready:', url);
      } else {
        throw new Error(result.reason || result.message || 'Deployment is not responding');
      }
    } catch (err) {
      console.error('[InstantPreview] Health check failed:', err);
      setError(err.message || 'Could not connect to preview server');
      setStatus('error');
      onError?.(err);
    }
  };

  const retry = () => {
    const deploymentUrl = process.env.NEXT_PUBLIC_FLY_DEPLOYMENT_URL || 
                         `https://${owner}-${repo}.fly.dev`;
    checkDeploymentHealth(deploymentUrl);
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-700 font-medium mb-2">Loading preview...</p>
        <p className="text-gray-600 text-sm">Connecting to deployment</p>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-gray-800 font-medium mb-2">Could not load preview</p>
        <p className="text-gray-600 text-sm text-center mb-6">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={retry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </a>
          )}
        </div>
      </div>
    );
  }

  // Ready state - show iframe
  if (status === 'ready' && previewUrl) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>
        <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-600">Preview URL: {previewUrl}</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const iframe = document.querySelector('iframe');
                if (iframe) {
                  iframe.src = previewUrl;
                }
              }}
              className="flex items-center gap-1 px-3 py-1 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default InstantPreview;
