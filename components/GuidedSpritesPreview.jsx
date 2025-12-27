'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GitBranch,
  Globe,
  Play,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Terminal,
  Settings,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * Guided Sprites Preview Component
 *
 * Features:
 * - Step-by-step configuration wizard
 * - Real-time status and logging
 * - Transparent data fetching and processing
 * - User interactions at each stage
 * - Settings and configuration display
 * - Live iframe when preview is ready
 */
export function GuidedSpritesPreview({
  projectId,
  currentBranch,
  repository,
  onPreviewReady,
}) {
  const { session } = useAuth();
  const [step, setStep] = useState('config'); // config, starting, building, running
  const [expandedStep, setExpandedStep] = useState(null);
  const [logs, setLogs] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [spriteName, setSpriteName] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [config, setConfig] = useState({
    repo: '',
    branch: '',
    packageManager: 'npm',
    scriptName: 'dev',
    timeout: 300,
  });
  const logsEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Initialize config from props
  useEffect(() => {
    if (currentBranch && repository) {
      const repoString = `${currentBranch.owner}/${currentBranch.repo}`;
      setConfig((prev) => ({
        ...prev,
        repo: repoString,
        branch: currentBranch.name,
      }));
    }
  }, [currentBranch, repository]);

  // Log helper
  const addLog = (type, message, details = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type, // 'info', 'success', 'error', 'warning', 'data'
        message,
        details,
        timestamp,
      },
    ]);
  };

  // Start preview
  const handleStartPreview = async () => {
    if (!config.repo || !config.branch) {
      setError('Please configure repository and branch');
      return;
    }

    setIsStarting(true);
    setError(null);
    setLogs([]);
    setStep('starting');
    setExpandedStep('starting');

    try {
      // Step 1: Initialize request
      addLog('info', '🚀 Initializing preview launch...');
      addLog('data', 'Configuration:', {
        projectId,
        repo: config.repo,
        branch: config.branch,
        packageManager: config.packageManager,
        scriptName: config.scriptName,
        timeout: `${config.timeout}s`,
        authenticated: !!session,
      });

      // Step 2: Call API to create sprite
      addLog('info', '📦 Creating sprite in sprites.dev...');

      const headers = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/sprites-preview?projectId=${projectId}&repo=${config.repo}&branch=${config.branch}`,
        {
          method: 'GET',
          headers,
        }
      );

      addLog('data', 'API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create sprite (${response.status})`);
      }

      const data = await response.json();

      addLog('success', '✅ Sprite created successfully');
      addLog('data', 'Sprite Details:', {
        id: data.sprite.id,
        name: data.sprite.spriteName,
        status: data.sprite.status,
        projectId: data.sprite.projectId,
      });

      setSpriteName(data.sprite.spriteName);

      // Check if already running
      if (data.sprite.status === 'running' && data.sprite.spriteName) {
        const url = `https://${data.sprite.spriteName}.sprites.dev`;
        setPreviewUrl(url);
        setStep('running');
        addLog('success', '✅ Preview is ready!');
        addLog('data', 'Preview URL:', { url });
        setIsStarting(false);
        onPreviewReady?.(url);
        return;
      }

      // Step 3: Start polling for status
      addLog('info', '⏳ Waiting for sprite to be provisioned...');
      setStep('building');
      setExpandedStep('building');

      startStatusPolling(data.sprite.id, data.sprite.spriteName);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog('error', '❌ Failed to start preview: ' + errorMsg);
      setError(errorMsg);
      setIsStarting(false);
    }
  };

  // Poll for sprite status
  const startStatusPolling = (spriteId, spriteName) => {
    let pollCount = 0;
    const maxPolls = 120; // 10 minutes with 5-second intervals

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;

      try {
        const headers = {
          'Content-Type': 'application/json',
        };

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const statusResponse = await fetch('/api/sprites-preview', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            spriteId,
            action: 'status',
          }),
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const spriteStatus = statusData.sprite?.status;

          // Log status check
          if (pollCount === 1 || pollCount % 5 === 0) {
            addLog('info', `📊 Status check #${pollCount}`, {
              status: spriteStatus,
              port: statusData.sprite?.port,
              elapsed: `${(pollCount * 5).toFixed(0)}s`,
            });
          }

          if (spriteStatus === 'running') {
            clearInterval(pollIntervalRef.current);
            const url = `https://${spriteName}.sprites.dev`;
            setPreviewUrl(url);
            setStep('running');
            setExpandedStep('running');
            addLog('success', '✅ Preview is now running!');
            addLog('data', 'Preview URL:', { url, port: statusData.sprite?.port });
            setIsStarting(false);
            onPreviewReady?.(url);
            return;
          }

          if (spriteStatus === 'error') {
            clearInterval(pollIntervalRef.current);
            const errorMessage = statusData.sprite?.errorMessage || 'Sprite provisioning failed';
            addLog('error', '❌ ' + errorMessage);
            setError(errorMessage);
            setIsStarting(false);
            return;
          }
        }
      } catch (pollErr) {
        // Log occasional poll errors
        if (pollCount % 10 === 0) {
          addLog('warning', `⚠️ Status check error (will retry): ${pollErr.message}`);
        }
      }

      // Timeout handling
      if (pollCount >= maxPolls) {
        clearInterval(pollIntervalRef.current);
        addLog('warning', '⏱️ Status polling timeout - assuming sprite is ready');
        const url = `https://${spriteName}.sprites.dev`;
        setPreviewUrl(url);
        setStep('running');
        setIsStarting(false);
      }
    }, 5000);
  };

  // Copy URL
  const handleCopy = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { id: 'config', label: 'Configure', icon: Settings },
      { id: 'starting', label: 'Starting', icon: Zap },
      { id: 'building', label: 'Building', icon: Terminal },
      { id: 'running', label: 'Running', icon: Globe },
    ];

    return (
      <div className="flex items-center justify-between mb-6 px-6 pt-4">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div
              className={`flex flex-col items-center gap-2 ${
                step === s.id ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step === s.id
                    ? 'bg-blue-600 text-white'
                    : step > s.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > s.id ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <s.icon className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-medium text-gray-700">{s.label}</span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded ${
                  step > s.id ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Render configuration panel
  const renderConfigPanel = () => {
    return (
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configuration
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Repository
            </label>
            <input
              type="text"
              value={config.repo}
              onChange={(e) => setConfig({ ...config, repo: e.target.value })}
              disabled={isStarting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              placeholder="owner/repo"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Branch
            </label>
            <input
              type="text"
              value={config.branch}
              onChange={(e) => setConfig({ ...config, branch: e.target.value })}
              disabled={isStarting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              placeholder="main"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Package Manager
            </label>
            <select
              value={config.packageManager}
              onChange={(e) => setConfig({ ...config, packageManager: e.target.value })}
              disabled={isStarting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
            >
              <option>npm</option>
              <option>yarn</option>
              <option>pnpm</option>
              <option>bun</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Dev Script
            </label>
            <input
              type="text"
              value={config.scriptName}
              onChange={(e) => setConfig({ ...config, scriptName: e.target.value })}
              disabled={isStarting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              placeholder="dev"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <button
          onClick={handleStartPreview}
          disabled={isStarting || !config.repo || !config.branch}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Play className="w-4 h-4" />
          {isStarting ? 'Starting Preview...' : 'Start Preview'}
        </button>
      </div>
    );
  };

  // Render logs panel
  const renderLogsPanel = () => {
    return (
      <div className="border-t border-gray-200 bg-gray-900 text-gray-100 p-4 rounded-b-lg max-h-80 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500">Logs will appear here...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-2 pb-2 border-b border-gray-700 last:border-0">
              <div className="flex gap-3">
                <span className="text-gray-500 flex-shrink-0 w-20">{log.timestamp}</span>
                <span
                  className={`flex-shrink-0 font-bold w-16 ${
                    log.type === 'success'
                      ? 'text-green-400'
                      : log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'warning'
                      ? 'text-yellow-400'
                      : log.type === 'data'
                      ? 'text-cyan-400'
                      : 'text-blue-400'
                  }`}
                >
                  {log.type.toUpperCase()}
                </span>
                <span className="flex-1">{log.message}</span>
              </div>
              {log.details && (
                <div className="ml-20 mt-1 text-gray-400 text-xs bg-gray-800 p-2 rounded border border-gray-700">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    );
  };

  // Preview running state
  if (previewUrl && !isStarting) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-lg">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Sprites Preview</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Running
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep('config')}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Reset
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

        {/* URL Display */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <p className="text-xs text-gray-600">
            Preview URL:{' '}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-mono break-all"
            >
              {previewUrl}
            </a>
          </p>
        </div>

        {/* Preview iframe */}
        <iframe
          src={previewUrl}
          className="flex-1 w-full border-0"
          title="Sprites Preview"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
        />
      </div>
    );
  }

  // Configuration and monitoring state
  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-lg">
      {renderStepIndicator()}

      <div className="flex-1 overflow-y-auto">
        {/* Steps Container */}
        <div className="space-y-0">
          {/* Configuration Step */}
          <div className="border-b border-gray-200">
            <button
              onClick={() =>
                setExpandedStep(expandedStep === 'config' ? null : 'config')
              }
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Step 1: Configure Preview</span>
              </div>
              {expandedStep === 'config' ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            {expandedStep === 'config' && renderConfigPanel()}
          </div>

          {/* Status Step */}
          {(step !== 'config' || logs.length > 0) && (
            <div className="border-b border-gray-200">
              <button
                onClick={() =>
                  setExpandedStep(expandedStep === 'status' ? null : 'status')
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isStarting ? (
                    <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : logs.length > 0 && !logs.some((l) => l.type === 'error') ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : logs.length > 0 && logs.some((l) => l.type === 'error') ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Terminal className="w-5 h-5 text-gray-600" />
                  )}
                  <div className="text-left">
                    <span className="font-medium text-gray-900">
                      Step 2: Real-time Status & Logs
                    </span>
                    {logs.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({logs.length} log entries)
                      </span>
                    )}
                  </div>
                </div>
                {expandedStep === 'status' ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              {expandedStep === 'status' && renderLogsPanel()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuidedSpritesPreview;
