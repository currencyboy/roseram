'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * Debug Preview Component
 * Shows detailed diagnostics during preview setup
 */
export function DebugPreview({ owner, repo, branch = 'main', elapsedSeconds = 0 }) {
  const { session } = useAuth();
  const [diagnostics, setDiagnostics] = useState({
    step: 'checking-auth',
    checks: [],
    logs: [],
    error: null,
  });

  const addLog = (message, type = 'info') => {
    setDiagnostics(prev => ({
      ...prev,
      logs: [...prev.logs, { message, type, time: new Date().toLocaleTimeString() }]
    }));
    console.log(`[DebugPreview] ${type.toUpperCase()}: ${message}`);
  };

  const addCheck = (name, status, message) => {
    setDiagnostics(prev => ({
      ...prev,
      checks: [...prev.checks, { name, status, message }]
    }));
  };

  useEffect(() => {
    const runDiagnostics = async () => {
      // Reset diagnostics on new owner/repo/branch
      setDiagnostics({
        step: 'checking-auth',
        checks: [],
        logs: [],
        error: null,
      });

      // Check 1: Auth
      addLog('Checking authentication...', 'info');
      if (!session) {
        addCheck('Authentication', 'error', 'No session found. Please sign in first.');
        return;
      }
      if (!session.access_token) {
        addCheck('Authentication', 'error', 'Session exists but no access token');
        return;
      }
      addCheck('Authentication', 'success', `Authenticated as ${session.user?.email}`);
      addLog('✓ Authenticated', 'success');

      // Check 2: Parameters
      addLog('Checking parameters...', 'info');
      if (!owner || !repo) {
        addCheck('Parameters', 'error', `Missing owner (${owner}) or repo (${repo})`);
        return;
      }
      addCheck('Parameters', 'success', `Owner: ${owner}, Repo: ${repo}, Branch: ${branch}`);
      addLog(`✓ Parameters valid: ${owner}/${repo}@${branch}`, 'success');

      // Check 3: GitHub connectivity
      addLog('Checking GitHub connectivity...', 'info');
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);

        if (response.ok) {
          const data = await response.json();
          addCheck('GitHub', 'success', `Repository found: ${owner}/${repo}`);
          addLog('✓ Repository accessible on GitHub', 'success');
          addLog(`Repository details: ${data.description || 'No description'}`, 'debug');
        } else if (response.status === 404) {
          addCheck('GitHub', 'error', `Repository not found: ${owner}/${repo}`);
          addLog('✗ Repository not found on GitHub', 'error');
          addLog(`Make sure: owner="${owner}" and repo="${repo}" are correct`, 'error');
          addLog('Also check that the repository is public or you have access', 'error');
        } else {
          addCheck('GitHub', 'warn', `GitHub API error (${response.status})`);
          addLog(`GitHub returned status ${response.status}`, 'warn');
        }
      } catch (err) {
        addLog(`⚠ GitHub check failed: ${err.message}`, 'warn');
        addCheck('GitHub', 'warn', 'Could not verify repository (network issue)');
      }

      // Show what's happening
      addLog('Preview is being provisioned in the background...', 'info');
      addLog('Monitor this panel for real-time updates', 'debug');
      addCheck('Preview Status', 'warn', 'Provisioning in progress');

      setDiagnostics(prev => ({ ...prev, step: 'complete' }));
    };

    runDiagnostics();
    // Only run when owner/repo/branch changes, NOT when elapsedSeconds changes
  }, [session, owner, repo, branch]);

  return (
    <div className="w-full">
      {/* Status Checks */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Status Checks</h3>
        <div className="space-y-2">
          {diagnostics.checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
              {check.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
              {check.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
              {check.status === 'warn' && <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${
                  check.status === 'success' ? 'text-green-900' :
                  check.status === 'error' ? 'text-red-900' :
                  'text-yellow-900'
                }`}>{check.name}</p>
                <p className={`text-xs ${
                  check.status === 'success' ? 'text-green-700' :
                  check.status === 'error' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>{check.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Activity Log</h3>
        <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-xs space-y-1 max-h-64 overflow-auto">
          {diagnostics.logs.length === 0 && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader className="w-3 h-3 animate-spin" />
              Running diagnostics...
            </div>
          )}
          {diagnostics.logs.map((log, i) => (
            <div key={i} className={
              log.type === 'success' ? 'text-green-400' :
              log.type === 'error' ? 'text-red-400' :
              log.type === 'warn' ? 'text-yellow-400' :
              log.type === 'debug' ? 'text-gray-500' :
              'text-gray-300'
            }>
              <span className="text-gray-600">[{log.time}]</span> {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DebugPreview;
