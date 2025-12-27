'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Copy, Check, Trash2, Pause, Play } from 'lucide-react';

/**
 * Preview Terminal Component
 * Shows all activity: API calls, console logs, network requests, file operations, etc.
 */
export function PreviewTerminal({ isVisible = true }) {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef(null);
  const originalConsoleRef = useRef({});
  const fetchInterceptorRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  // Add log entry
  const addLog = (type, message, details = null) => {
    if (isPaused) return;

    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type, // 'log', 'error', 'warn', 'info', 'api', 'sprite', 'network'
        message,
        details,
        timestamp,
      },
    ]);
  };

  // Intercept console methods
  useEffect(() => {
    originalConsoleRef.current = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    console.log = (...args) => {
      originalConsoleRef.current.log(...args);
      const message = args.map((arg) => formatArg(arg)).join(' ');
      addLog('log', message, args);
    };

    console.error = (...args) => {
      originalConsoleRef.current.error(...args);
      const message = args.map((arg) => formatArg(arg)).join(' ');
      addLog('error', message, args);
    };

    console.warn = (...args) => {
      originalConsoleRef.current.warn(...args);
      const message = args.map((arg) => formatArg(arg)).join(' ');
      addLog('warn', message, args);
    };

    console.info = (...args) => {
      originalConsoleRef.current.info(...args);
      const message = args.map((arg) => formatArg(arg)).join(' ');
      addLog('info', message, args);
    };

    return () => {
      console.log = originalConsoleRef.current.log;
      console.error = originalConsoleRef.current.error;
      console.warn = originalConsoleRef.current.warn;
      console.info = originalConsoleRef.current.info;
    };
  }, [isPaused]);

  // Intercept fetch/network requests
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = function (...args) {
      const [resource, config] = args;
      const method = (config?.method || 'GET').toUpperCase();
      const url = typeof resource === 'string' ? resource : resource.url;

      // Log outgoing request
      addLog(
        'network',
        `📤 ${method} ${url}`,
        {
          method,
          url,
          headers: config?.headers,
          body: config?.body ? tryParseJSON(config.body) : null,
        }
      );

      // Call original fetch and log response
      return originalFetch.apply(this, args)
        .then((response) => {
          const status = response.status;
          const statusText = response.statusText;
          const statusColor = status >= 200 && status < 300 ? 'success' : 'error';

          // Log response status
          addLog(
            statusColor === 'success' ? 'network' : 'error',
            `📥 ${method} ${url} → ${status} ${statusText}`,
            {
              method,
              url,
              status,
              statusText,
              headers: Object.fromEntries(response.headers),
              size: response.headers.get('content-length') || 'unknown',
            }
          );

          // Clone response so it can be used downstream
          return response.clone();
        })
        .catch((error) => {
          addLog('error', `🚫 ${method} ${url} → Network Error: ${error.message}`, {
            error: error.message,
            stack: error.stack,
          });
          throw error;
        });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isPaused]);

  // Helper to format arguments
  const formatArg = (arg) => {
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  };

  // Helper to try parse JSON
  const tryParseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  };

  // Copy all logs to clipboard
  const handleCopyLogs = async () => {
    const text = logs
      .map((log) => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get log color based on type
  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      case 'network':
        return 'text-green-400';
      case 'sprite':
        return 'text-purple-400';
      case 'api':
        return 'text-cyan-400';
      case 'log':
      default:
        return 'text-gray-300';
    }
  };

  // Get log badge
  const getLogBadge = (type) => {
    switch (type) {
      case 'error':
        return '✗';
      case 'warn':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'network':
        return '↔';
      case 'sprite':
        return '◆';
      case 'api':
        return '⚡';
      case 'log':
      default:
        return '→';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`flex flex-col bg-gray-900 border-t border-gray-700 ${isCollapsed ? 'h-12' : 'h-64'} transition-all duration-300 overflow-hidden`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-gray-950 border-b border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono text-gray-400">
            Preview Terminal {logs.length > 0 && `(${logs.length} events)`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume' : 'Pause'}
            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
          >
            {isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setLogs([])}
            title="Clear logs"
            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyLogs}
            title="Copy logs"
            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
          >
            {isCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto font-mono text-xs p-4 bg-gray-900 space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Waiting for activity...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="text-gray-300 hover:bg-gray-800 p-2 rounded transition-colors group"
              >
                {/* Main log line */}
                <div className={`flex gap-2 ${getLogColor(log.type)}`}>
                  <span className="text-gray-500 flex-shrink-0 w-12">{log.timestamp}</span>
                  <span className="flex-shrink-0 w-6 font-bold">{getLogBadge(log.type)}</span>
                  <span className="text-gray-200 flex-1 break-words">{log.message}</span>
                </div>

                {/* Details (collapsed by default) */}
                {log.details && (
                  <details className="ml-20 mt-1 cursor-pointer">
                    <summary className="text-gray-500 text-xs hover:text-gray-400">
                      Show details
                    </summary>
                    <pre className="mt-2 bg-gray-800 p-2 rounded border border-gray-700 text-gray-400 overflow-x-auto max-h-32 overflow-y-auto text-xs">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Paused indicator */}
      {isPaused && (
        <div className="bg-yellow-900 border-t border-yellow-700 px-4 py-1 text-xs text-yellow-200 flex items-center gap-2">
          <span>⏸ Terminal paused</span>
          <button
            onClick={() => setIsPaused(false)}
            className="ml-auto px-2 py-0.5 bg-yellow-700 hover:bg-yellow-600 rounded text-xs"
          >
            Resume
          </button>
        </div>
      )}
    </div>
  );
}

export default PreviewTerminal;
