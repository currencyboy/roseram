'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader,
  Globe,
  CheckCircle,
  X,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * SpritesPreview Component - Refactored
 * 
 * Uses Sprites.dev for fast, ephemeral previews
 * Perfect for IDE-like repository previews
 * 
 * Usage:
 * <SpritesPreview repo="owner/repo" branch="main" />
 */
export function SpritesPreview({
  repo,
  branch = 'main',
  projectId,
  onUrlChange,
  onStatusChange,
  autoRefresh = true,
}) {
  const { session } = useAuth();

  // State
  const [sprite, setSprite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const iframeRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const statusPollInterval = useRef(null);

  // Initialize preview
  useEffect(() => {
    if (repo && branch && session?.user?.id) {
      initializePreview();
    }
  }, [repo, branch, session?.user?.id]);

  // Poll for status
  useEffect(() => {
    if (sprite && (status === 'initializing' || status === 'pending')) {
      const startPolling = () => {
        statusPollInterval.current = setInterval(() => {
          checkPreviewStatus();
        }, 5000);
      };

      startPolling();

      return () => {
        if (statusPollInterval.current) {
          clearInterval(statusPollInterval.current);
        }
      };
    }
  }, [sprite, status]);

  // Update status callback
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  // Update URL callback
  useEffect(() => {
    if (onUrlChange && sprite?.previewUrl) {
      onUrlChange(sprite.previewUrl);
    }
  }, [sprite?.previewUrl, onUrlChange]);

  /**
   * Initialize sprite preview
   */
  async function initializePreview() {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);
    setStatus('initializing');
    setLogs([]);
    addLog('Starting Sprites.dev preview...');

    try {
      // Get auth token from session
      const { data } = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json()).catch(() => ({ data: null }));

      const authToken = data?.session?.access_token || session.user.user_metadata?.auth_token;

      if (!authToken) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `/api/sprites-preview?repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(
          branch
        )}&projectId=${projectId || ''}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to start preview`);
      }

      const data = await response.json();

      if (data.success && data.sprite) {
        setSprite(data.sprite);
        setStatus('provisioning');
        addLog(`✓ Sprite created: ${data.sprite.spriteName}`);
        addLog(`Preview URL: ${data.sprite.previewUrl || 'pending...'}`);
        addLog('Waiting for machine to initialize...');
      } else {
        throw new Error(data.error || 'Failed to create sprite');
      }
    } catch (err) {
      console.error('Sprite initialization error:', err);
      setError(err.message);
      setStatus('error');
      addLog(`✗ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Check preview status
   */
  async function checkPreviewStatus() {
    if (!sprite?.id || !session?.user?.id) return;

    try {
      const { data } = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json()).catch(() => ({ data: null }));

      const authToken = data?.session?.access_token || session.user.user_metadata?.auth_token;

      if (!authToken) return;

      const response = await fetch('/api/sprites-preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spriteId: sprite.id,
          action: 'status',
        }),
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.success && data.sprite) {
        setSprite(data.sprite);

        if (data.sprite.status === 'running') {
          setStatus('running');
          addLog('✓ Preview is running and ready!');
          if (statusPollInterval.current) {
            clearInterval(statusPollInterval.current);
          }
        } else if (data.sprite.status === 'error') {
          setStatus('error');
          addLog(`✗ Error: ${data.sprite.errorMessage}`);
        } else {
          addLog(`Status: ${data.sprite.status}`);
        }
      }
    } catch (err) {
      console.error('Status check failed:', err);
    }
  }

  /**
   * Refresh preview
   */
  function refreshPreview() {
    setRefreshKey(k => k + 1);
  }

  /**
   * Destroy preview
   */
  async function destroyPreview() {
    if (!sprite?.id) return;

    if (!confirm('Stop this preview? This will destroy the sprite.')) {
      return;
    }

    try {
      const { data } = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json()).catch(() => ({ data: null }));

      const authToken = data?.session?.access_token || session.user.user_metadata?.auth_token;

      if (!authToken) throw new Error('No auth token');

      const response = await fetch(`/api/sprites-preview?spriteId=${sprite.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        setSprite(null);
        setStatus('idle');
        setLogs([]);
        addLog('Preview destroyed');
      }
    } catch (err) {
      addLog(`Error destroying preview: ${err.message}`);
    }
  }

  /**
   * Copy URL to clipboard
   */
  function copyUrl() {
    if (sprite?.previewUrl) {
      navigator.clipboard.writeText(sprite.previewUrl);
    }
  }

  /**
   * Add log message
   */
  function addLog(message) {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }

  // Idle state
  if (status === 'idle' && !sprite) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Globe className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sprites Preview</h2>
        <p className="text-gray-600 text-center mb-6">
          {repo ? (
            <>Repository: <code className="bg-gray-200 px-2 py-1 rounded">{repo}</code></>
          ) : (
            'No repository selected'
          )}
        </p>
        <button
          onClick={initializePreview}
          disabled={!repo || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
        >
          <Globe className="w-4 h-4" />
          Start Sprites Preview
        </button>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900">Preview Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={initializePreview}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
          {sprite && (
            <button
              onClick={destroyPreview}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Destroy
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading/provisioning state
  if ((status === 'initializing' || status === 'provisioning' || status === 'pending') && sprite) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              <h3 className="font-semibold text-gray-900">Sprites Preview Starting</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-2 hover:bg-blue-100 rounded transition-colors"
                title="Toggle details"
              >
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={destroyPreview}
                className="p-2 hover:bg-red-100 rounded transition-colors"
                title="Stop preview"
              >
                <X className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">Sprite: {sprite.spriteName}</p>
        </div>

        {/* Details */}
        {showDetails && (
          <div className="flex-1 overflow-auto p-4 bg-gray-50 border-b border-gray-200 font-mono text-xs text-gray-700 max-h-48">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))
            ) : (
              <div className="text-gray-500">Initializing...</div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <p className="text-gray-600 font-medium mb-2">Setting up Sprites environment...</p>
            <p className="text-sm text-gray-500">This typically takes 30-90 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // Running state
  if (status === 'running' && sprite) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-3 bg-green-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-900">Preview Running</p>
              <p className="text-xs text-gray-600">{sprite.spriteName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* URL Display */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-3 py-1">
              <code className="text-xs text-gray-600 truncate max-w-xs">{sprite.previewUrl}</code>
              <button
                onClick={copyUrl}
                className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                title="Copy URL"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={refreshPreview}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>

            <a
              href={sprite.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5 text-gray-600" />
            </a>

            <button
              onClick={destroyPreview}
              className="p-2 hover:bg-red-100 rounded transition-colors"
              title="Stop preview"
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            key={refreshKey}
            ref={iframeRef}
            src={sprite.previewUrl}
            className="w-full h-full border-0"
            title="Sprites Preview"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-storage allow-top-navigation"
          />
        </div>
      </div>
    );
  }

  return null;
}

export default SpritesPreview;
