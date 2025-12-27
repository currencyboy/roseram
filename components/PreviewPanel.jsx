'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, ChevronLeft, ChevronRight, Maximize2, ExternalLink, Globe, Code2 } from 'lucide-react';

export function PreviewPanel({
  previewUrl = '/',
  autoRefresh = true,
  onUrlChange,
  refreshTrigger = 0,
  developmentServerUrl = 'http://localhost:3001',
}) {
  const [currentPath, setCurrentPath] = useState(previewUrl);
  const [displayUrl, setDisplayUrl] = useState(currentPath);
  const [history, setHistory] = useState([previewUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef(null);
  const urlInputRef = useRef(null);

  // Auto-refresh iframe when trigger changes
  useEffect(() => {
    if (autoRefresh && refreshTrigger > 0) {
      setRefreshKey(prev => prev + 1);
    }
  }, [refreshTrigger, autoRefresh]);

  // Navigate to a path
  const navigateToPath = (path) => {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // Keep root path as / for Next.js app routing
    if (normalizedPath === '' || normalizedPath === null || normalizedPath === undefined) {
      normalizedPath = '/';
    }
    setCurrentPath(normalizedPath);
    setDisplayUrl(normalizedPath);

    // Update history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(normalizedPath);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);

    onUrlChange?.(normalizedPath);
    setRefreshKey(prev => prev + 1);
  };

  const handleUrlInputChange = (e) => {
    setDisplayUrl(e.target.value);
  };

  const handleUrlInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      navigateToPath(displayUrl);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const path = history[newIndex];
      setCurrentPath(path);
      setDisplayUrl(path);
      setRefreshKey(prev => prev + 1);
      onUrlChange?.(path);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const path = history[newIndex];
      setCurrentPath(path);
      setDisplayUrl(path);
      setRefreshKey(prev => prev + 1);
      onUrlChange?.(path);
    }
  };

  const refreshPage = () => {
    setRefreshKey(prev => prev + 1);
  };

  const openInNewTab = () => {
    window.open(`${developmentServerUrl}${currentPath}`, '_blank');
  };

  const fullScreenUrl = `${developmentServerUrl}${currentPath}`;

  const detectLanguage = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    const langMap = {
      html: { name: 'HTML', color: 'orange' },
      htm: { name: 'HTML', color: 'orange' },
      js: { name: 'JavaScript', color: 'yellow' },
      jsx: { name: 'React', color: 'blue' },
      ts: { name: 'TypeScript', color: 'blue' },
      tsx: { name: 'React/TS', color: 'blue' },
      vue: { name: 'Vue', color: 'green' },
      svelte: { name: 'Svelte', color: 'red' },
      css: { name: 'CSS', color: 'blue' },
      scss: { name: 'SCSS', color: 'purple' },
      json: { name: 'JSON', color: 'gray' },
      md: { name: 'Markdown', color: 'gray' },
    };
    return langMap[ext] || { name: ext.toUpperCase(), color: 'gray' };
  };

  const currentLanguage = detectLanguage(currentPath);
  const colorClasses = {
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    red: 'bg-red-100 text-red-700 border-red-300',
    purple: 'bg-purple-100 text-purple-700 border-purple-300',
    gray: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  return (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden">
      {/* Navigation Bar */}
      <div className="border-b border-gray-200 bg-gray-50 p-3 flex items-center gap-2">
        {/* Back/Forward Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={historyIndex <= 0}
            className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300" />

        {/* URL Input */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded">
          <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={urlInputRef}
            type="text"
            value={displayUrl}
            onChange={handleUrlInputChange}
            onKeyDown={handleUrlInputKeyDown}
            placeholder="/path/to/page"
            className="flex-1 bg-transparent outline-none text-sm font-mono"
          />
        </div>

        {/* Language Badge */}
        <div className={`px-2 py-1 rounded text-xs font-semibold border ${colorClasses[currentLanguage.color]} flex items-center gap-1`}>
          <Code2 className="w-3 h-3" />
          {currentLanguage.name}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={refreshPage}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Refresh preview"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={openInNewTab}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden bg-gray-100 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="inline-block">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
                <p className="text-sm text-gray-600">Loading preview...</p>
              </div>
            </div>
          </div>
        )}
        <iframe
          key={refreshKey}
          ref={iframeRef}
          src={`${developmentServerUrl}${currentPath}`}
          className="w-full h-full border-0 bg-white"
          title="Live Preview"
          onLoad={() => setIsLoading(false)}
          onLoadStart={() => setIsLoading(true)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
        />
      </div>

      {/* Info Footer */}
      <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Auto-refresh: <span className={autoRefresh ? 'text-green-600 font-medium' : 'text-gray-500'}>
            {autoRefresh ? '✓ ON' : 'OFF'}
          </span></span>
          <span className="text-gray-400">Dev Server: {developmentServerUrl}</span>
        </div>
      </div>
    </div>
  );
}
