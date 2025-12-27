'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Globe, ExternalLink, RefreshCw, Settings, Zap, Save } from 'lucide-react';
import { useIntegrations } from '@/lib/integrations-context';
import { useAuth } from './AuthProvider';

/**
 * Enhanced preview component with integration support
 * Auto-detects preview URLs from user configurations
 * Allows saving and managing preview settings
 */
export function SimplePreview({ projectId, onOpenIntegrations }) {
  const { session } = useAuth();
  const { github } = useIntegrations();

  const [previewUrl, setPreviewUrl] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [displayUrl, setDisplayUrl] = useState('/');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [savedPreviewUrl, setSavedPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved preview URL on mount
  useEffect(() => {
    const loadSavedPreviewUrl = async () => {
      try {
        const response = await fetch('/api/integrations/load-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.preview?.url) {
            setSavedPreviewUrl(data.preview.url);
            setPreviewUrl(data.preview.url);
          }
        }
      } catch (error) {
        console.warn('Failed to load saved preview URL:', error);
      }
    };

    loadSavedPreviewUrl();
  }, []);

  // Generate suggestions based on integrations
  useEffect(() => {
    const generateSuggestions = () => {
      const sug = [
        {
          label: 'Local (Default)',
          value: 'http://localhost:3000',
          description: 'Your local dev server'
        },
        {
          label: 'Alternative Port',
          value: 'http://localhost:3001',
          description: 'Common alternative port'
        }
      ];

      // Add GitHub integration suggestion
      if (github?.token) {
        sug.push({
          label: 'GitHub Connected',
          value: 'http://localhost:3000',
          description: '✓ Your GitHub is connected'
        });
      }

      setSuggestions(sug);
    };

    generateSuggestions();
  }, [github]);

  const savePreviewUrl = async (url) => {
    if (!session?.user) {
      console.log('Not authenticated, saving locally only');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/integrations/save-env-vars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token || ''}`,
        },
        body: JSON.stringify({
          provider: 'preview',
          metadata: { url },
        }),
      });

      if (response.ok) {
        setSavedPreviewUrl(url);
        console.log('Preview URL saved successfully');
      } else {
        console.warn('Failed to save preview URL');
      }
    } catch (error) {
      console.error('Error saving preview URL:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (!previewUrl.trim()) {
      alert('Please enter a preview URL');
      return;
    }
    savePreviewUrl(previewUrl);
    setShowInstructions(false);
  };

  const navigateToPath = (path) => {
    let normalized = path.startsWith('/') ? path : `/${path}`;
    if (!normalized || normalized === '') normalized = '/';
    setCurrentPath(normalized);
    setDisplayUrl(normalized);
    setRefreshKey(prev => prev + 1);
  };

  const refreshPage = () => setRefreshKey(prev => prev + 1);

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(`${previewUrl}${currentPath}`, '_blank');
    }
  };

  if (showInstructions) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Preview Your App</h1>
            <p className="text-gray-600">Connect your running development server to view it here</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preview URL
                </label>
                <input
                  type="text"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  placeholder="http://localhost:3000 or https://example.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the URL of your running dev server (local or remote)
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Connect Preview
              </button>
            </form>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">How to use:</h3>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-semibold text-blue-600">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Start your dev server</p>
                    <code className="block text-xs bg-gray-100 p-2 rounded mt-1 font-mono text-gray-700">
                      npm run dev
                    </code>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-semibold text-blue-600">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Get the URL</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Usually <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">http://localhost:3000</code>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-semibold text-blue-600">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Paste it above</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Enter your URL and click "Connect Preview"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 flex gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>For localhost URLs:</strong> Your browser must be able to access the server at the URL you provide. This works best when previewing from the same machine.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview running
  return (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden">
      {/* Navigation Bar */}
      <div className="border-b border-gray-200 bg-gray-50 p-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded">
          <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={displayUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigateToPath(displayUrl);
              }
            }}
            placeholder="/path/to/page"
            className="flex-1 bg-transparent outline-none text-sm font-mono"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={refreshPage}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openInNewTab}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowInstructions(true)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Change URL"
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        <iframe
          key={refreshKey}
          src={`${previewUrl}${currentPath}`}
          className="w-full h-full border-0 bg-white"
          title="Live Preview"
          sandboxattr="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
        />
      </div>

      {/* Info Footer */}
      <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Preview: <code className="text-gray-900 font-mono">{previewUrl}</code></span>
          <button
            onClick={() => setShowInstructions(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Change URL
          </button>
        </div>
      </div>
    </div>
  );
}

export default SimplePreview;
