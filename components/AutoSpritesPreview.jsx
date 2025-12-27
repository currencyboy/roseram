'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader, AlertCircle, RefreshCw, ExternalLink, Zap, Copy, CheckCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * AutoSpritesPreview Component
 * Works like Builder.io's instant preview:
 * - Auto-launches when owner/repo/branch are provided
 * - No setup wizard needed
 * - Shows loading → running states
 * - Renders iframe when preview URL is ready
 */
export function AutoSpritesPreview({
  projectId,
  owner,
  repo,
  branch = 'main',
  onError,
  onReady,
  onStatusChange,
}) {
  const { session } = useAuth();
  const [status, setStatus] = useState('initializing'); // initializing, launching, running, error
  const [sprite, setSprite] = useState(null);
  const [error, setError] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  // Auto-launch sprite when component mounts or params change
  useEffect(() => {
    if (!owner || !repo || !session?.access_token) {
      console.log('[AutoSpritesPreview] Waiting for required params:', { owner, repo, hasToken: !!session?.access_token });
      return;
    }

    launchSprite();
  }, [owner, repo, branch, session?.access_token]);

  const launchSprite = async () => {
    try {
      setStatus('launching');
      setError(null);
      setSprite(null);

      console.log('[AutoSpritesPreview] Launching sprite:', { owner, repo, branch, projectId });

      // Call Sprites API endpoint
      const response = await fetch(
        `/api/sprites-preview?projectId=${projectId || `${owner}-${repo}`}&repo=${owner}/${repo}&branch=${branch}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to launch sprite');
      }

      setSprite(data.sprite);
      onStatusChange?.('launching');
      console.log('[AutoSpritesPreview] Sprite created:', data.sprite);

      // Start polling for sprite status
      if (data.sprite.status !== 'running' && data.sprite.status !== 'error') {
        startStatusPolling(data.sprite.id);
      } else if (data.sprite.status === 'running') {
        handleSpritesReady(data.sprite);
      } else if (data.sprite.status === 'error') {
        handleSpritesError(data.sprite.errorMessage);
      }
    } catch (err) {
      console.error('[AutoSpritesPreview] Launch error:', err);

      // Check if it's a database setup error
      const errorMsg = err.message || 'Failed to launch sprite';
      if (errorMsg.includes('not initialized') || errorMsg.includes('setup-auto-preview-schema.sql')) {
        const setupError = `Database not set up. Please run: scripts/setup-auto-preview-schema.sql in your Supabase SQL Editor. See SETUP_AUTO_PREVIEW_DATABASE.md for instructions.`;
        handleSpritesError(setupError);
      } else {
        handleSpritesError(errorMsg);
      }
    }
  };

  const startStatusPolling = (spriteId) => {
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes with 5s interval

    const interval = setInterval(async () => {
      pollCount++;

      try {
        const response = await fetch('/api/sprites-preview', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ spriteId, action: 'status' }),
        });

        const data = await response.json();

        if (response.ok && data.sprite) {
          console.log(`[AutoSpritesPreview] Status poll ${pollCount}:`, data.sprite.status);
          setSprite(data.sprite);

          if (data.sprite.status === 'running') {
            clearInterval(interval);
            handleSpritesReady(data.sprite);
          } else if (data.sprite.status === 'error') {
            clearInterval(interval);
            handleSpritesError(data.sprite.errorMessage || 'Sprite provisioning failed');
          }
        }
      } catch (err) {
        console.error('[AutoSpritesPreview] Polling error:', err);
      }

      if (pollCount >= maxPolls) {
        clearInterval(interval);
        handleSpritesError('Sprite provisioning timeout (10 minutes). Please try again.');
      }
    }, 5000);
  };

  const handleSpritesReady = (spriteData) => {
    setStatus('running');
    setSprite(spriteData);
    onStatusChange?.('running');
    onReady?.({
      url: spriteData.previewUrl,
      id: spriteData.id,
      status: 'running',
    });
    console.log('[AutoSpritesPreview] Preview ready:', spriteData.previewUrl);
  };

  const handleSpritesError = (errorMsg) => {
    setStatus('error');
    setError(errorMsg);
    onStatusChange?.('error');
    onError?.(errorMsg);
    console.error('[AutoSpritesPreview] Error:', errorMsg);
  };

  const refreshSprite = () => {
    setIframeKey(prev => prev + 1);
  };

  const openInNewTab = () => {
    if (sprite?.previewUrl) {
      window.open(sprite.previewUrl, '_blank');
    }
  };

  const copyUrl = () => {
    if (sprite?.previewUrl) {
      navigator.clipboard.writeText(sprite.previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state
  if (status === 'initializing' || status === 'launching') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Launching Preview</h3>
          <p className="text-gray-600 mb-1">Cloning repository & starting dev server...</p>
          <p className="text-sm text-gray-500">This takes 30-60 seconds</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Preview Error</h3>
        <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
        <button
          onClick={launchSprite}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Ready state - show iframe
  if (status === 'running' && sprite?.previewUrl) {
    return (
      <div className="w-full h-full flex flex-col bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Preview Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600 mr-4 font-mono text-xs">{sprite.previewUrl}</div>
            <button
              onClick={copyUrl}
              className="flex items-center gap-1 px-3 py-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors text-sm"
              title="Copy URL"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={refreshSprite}
              className="flex items-center gap-1 px-3 py-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors text-sm"
              title="Refresh preview"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <a
              href={sprite.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </a>
          </div>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={sprite.previewUrl}
            title="Live Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
          />
        </div>
      </div>
    );
  }

  return null;
}

export default AutoSpritesPreview;
