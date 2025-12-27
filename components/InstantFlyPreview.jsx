'use client';

import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Globe, RefreshCw, ExternalLink, Play, Copy, Check } from 'lucide-react';

/**
 * Instant Fly Preview Component
 * 
 * Boots Fly.io machine immediately without auth blocking
 * Works like Builder.io - just gives you the URL right away
 */
export function InstantFlyPreview({
  projectId,
  currentBranch,
  repository,
  onUrlReady,
  onError,
}) {
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [appName, setAppName] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [copied, setCopied] = useState(false);

  // Boot machine immediately
  useEffect(() => {
    const bootPreview = async () => {
      if (!projectId || !currentBranch || !repository) {
        const msg = 'Missing project configuration';
        setError(msg);
        onError?.(msg);
        setLoading(false);
        return;
      }

      try {
        setStatus('launching');
        
        // Format repo as owner/repo
        const repoString = `${currentBranch.owner}/${currentBranch.repo}`;
        
        console.log('[InstantFlyPreview] Booting machine for:', {
          projectId,
          repo: repoString,
          branch: currentBranch.name,
        });

        // Call the preview API without auth - just boot it
        const response = await fetch(
          `/api/instant-preview?projectId=${projectId}&repo=${repoString}&branch=${currentBranch.name}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to boot preview');
        }

        const data = await response.json();
        
        if (!data.previewUrl || !data.appName) {
          throw new Error('No preview URL returned');
        }

        console.log('[InstantFlyPreview] Machine booted:', {
          appName: data.appName,
          url: data.previewUrl,
          status: data.status,
        });

        setAppName(data.appName);
        setPreviewUrl(data.previewUrl);
        setStatus(data.status || 'ready');
        onUrlReady?.(data.previewUrl);
        setLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[InstantFlyPreview] Boot error:', errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
        setLoading(false);
      }
    };

    bootPreview();
  }, [projectId, currentBranch, repository, onUrlReady, onError]);

  // Copy URL to clipboard
  const handleCopy = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state - machine is booting
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">Launching Fly.io Machine</p>
        <p className="text-sm text-gray-600 mb-4">
          Booting your preview environment...
        </p>
        {appName && (
          <div className="mt-4 p-4 bg-white rounded-lg max-w-md">
            <p className="text-xs text-gray-600 mb-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{appName}</span>
            </p>
            <p className="text-xs text-gray-500">
              {currentBranch?.name && `Branch: ${currentBranch.name}`}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-50 p-6">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-lg font-medium text-red-900 mb-2">Preview Error</p>
        <p className="text-sm text-red-700 text-center mb-6 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // Preview is ready - show URL and iframe
  if (previewUrl) {
    return (
      <div className="flex flex-col h-full">
        {/* URL Bar */}
        <div className="bg-white border-b border-gray-200 p-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded">
            <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              value={previewUrl}
              readOnly
              className="flex-1 bg-transparent outline-none text-sm font-mono text-gray-700"
            />
          </div>
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

        {/* Live Preview Iframe */}
        <iframe
          key={previewUrl}
          src={previewUrl}
          className="flex-1 w-full border-0 bg-white"
          title="Live Preview"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
          onError={(e) => {
            console.error('[InstantFlyPreview] Iframe error:', e);
          }}
        />

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Status: <span className="font-medium text-gray-900">{status || 'running'}</span></span>
          </div>
          <span className="text-gray-500">
            {appName}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

export default InstantFlyPreview;
