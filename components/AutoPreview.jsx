'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader,
  RefreshCw,
  Trash2,
  Copy,
  Github,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * Automated Preview Component
 * - Detects package manager automatically
 * - Creates package.json if needed
 * - Spins up preview with one click
 * - Shows live preview URL
 */
export function AutoPreview({
  projectId,
  owner,
  repo,
  branch = 'main',
  currentBranch,
  repository,
  onPreviewReady,
  autoStart = false
}) {
  const { session, signIn } = useAuth();

  // Preview state
  const [previewState, setPreviewState] = useState('idle'); // idle, starting, running, error, stopped
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [effectiveProjectId, setEffectiveProjectId] = useState(projectId);
  const [effectiveOwner, setEffectiveOwner] = useState(owner);
  const [effectiveRepo, setEffectiveRepo] = useState(repo);
  const [effectiveBranch, setEffectiveBranch] = useState(branch);

  // Polling state
  const [pollInterval, setPollInterval] = useState(null);

  // Pull config from Status tab (currentBranch takes precedence)
  useEffect(() => {
    if (currentBranch) {
      setEffectiveOwner(currentBranch.owner);
      setEffectiveRepo(currentBranch.repo);
      setEffectiveBranch(currentBranch.name);
    } else if (repository) {
      setEffectiveOwner(repository.owner);
      setEffectiveRepo(repository.name);
      setEffectiveBranch(branch || 'main');
    }
  }, [currentBranch, repository, branch]);

  // Auto-start preview when config is ready and session exists
  useEffect(() => {
    if (autoStart && session?.access_token && effectiveOwner && effectiveRepo && !projectId) {
      const generatedProjectId = `preview-${effectiveOwner}-${effectiveRepo}-${Date.now()}`;
      setEffectiveProjectId(generatedProjectId);
    }
  }, [autoStart, session?.access_token, effectiveOwner, effectiveRepo, projectId]);

  // Load existing preview on mount
  useEffect(() => {
    if (effectiveProjectId && session?.access_token) {
      loadPreviewStatus();
    }
  }, [effectiveProjectId, session?.access_token]);

  // Update elapsed time
  useEffect(() => {
    if (previewState === 'starting' && startTime) {
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [previewState, startTime]);

  // Poll for preview status
  useEffect(() => {
    if (previewState === 'starting' && effectiveProjectId) {
      const interval = setInterval(loadPreviewStatus, 3000);
      setPollInterval(interval);
      return () => clearInterval(interval);
    }
  }, [previewState, effectiveProjectId]);

  const loadPreviewStatus = async () => {
    if (!session?.access_token || !effectiveProjectId) {
      return;
    }

    try {
      const response = await fetch(`/api/auto-preview?projectId=${effectiveProjectId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const { preview } = await response.json();
        setPreviewData(preview);

        // Update state based on preview status
        switch (preview.status) {
          case 'running':
            setPreviewState('running');
            setError(null);
            if (pollInterval) clearInterval(pollInterval);
            onPreviewReady?.(preview);
            break;
          case 'error':
            setPreviewState('error');
            setError(preview.error_message || 'Failed to start preview');
            if (pollInterval) clearInterval(pollInterval);
            break;
          case 'stopped':
            setPreviewState('stopped');
            if (pollInterval) clearInterval(pollInterval);
            break;
          default:
            // Still provisioning
            setPreviewState('starting');
            break;
        }
      }
    } catch (err) {
      console.error('Failed to load preview status', err);
    }
  };

  const startPreview = async () => {
    // Validate repository information (use effective values from status tab)
    if (!effectiveOwner || !effectiveRepo) {
      setError('Repository information is missing. Please select a repository first.');
      console.error('[AutoPreview] Missing repo info:', { projectId: effectiveProjectId, owner: effectiveOwner, repo: effectiveRepo });
      return;
    }

    if (!session?.access_token) {
      setShowDemoPrompt(true);
      return;
    }

    try {
      setPreviewState('starting');
      setError(null);
      setStartTime(Date.now());
      setElapsedTime(0);

      // Generate projectId if not provided
      const generatedProjectId = effectiveProjectId || `preview-${effectiveOwner}-${effectiveRepo}-${Date.now()}`;
      setEffectiveProjectId(generatedProjectId);

      console.log('[AutoPreview] Starting preview with:', { generatedProjectId, owner: effectiveOwner, repo: effectiveRepo, branch: effectiveBranch });

      const response = await fetch('/api/auto-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: generatedProjectId,
          owner: effectiveOwner,
          repo: effectiveRepo,
          branch: effectiveBranch,
        }),
      });

      if (!response.ok) {
        const { error: errorMsg } = await response.json();
        throw new Error(errorMsg || 'Failed to start preview');
      }

      const { preview } = await response.json();
      setPreviewData(preview);
    } catch (err) {
      setPreviewState('error');
      setError(err.message || 'Failed to start preview');
      console.error('Error starting preview:', err);
    }
  };

  const stopPreview = async () => {
    if (!session?.access_token) {
      setError('You must be logged in to stop a preview');
      return;
    }

    if (!effectiveProjectId) {
      setError('No preview to stop');
      return;
    }

    try {
      const response = await fetch(`/api/auto-preview?projectId=${effectiveProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setPreviewState('stopped');
        setPreviewData(null);
        setError(null);
      }
    } catch (err) {
      setError('Failed to stop preview');
      console.error('Error stopping preview:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openPreview = () => {
    if (previewData?.preview_url) {
      window.open(previewData.preview_url, '_blank');
    }
  };

  const setupTestUser = async () => {
    try {
      setError(null);

      // Step 1: Create or get test user
      console.log('[AutoPreview] Creating test user...');
      const response = await fetch('/api/auth/test-user', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error || 'Failed to create test user';
        const suggestion = data.suggestion || '';
        const fullError = suggestion ? `${errorMsg}\n${suggestion}` : errorMsg;
        setError(fullError);
        console.error('[AutoPreview] Test user creation failed:', data);
        return;
      }

      const { email, password, isNewUser } = await response.json();
      console.log('[AutoPreview] Test user ready:', { email, isNewUser });

      // Step 2: Sign in with test user (with retry)
      console.log('[AutoPreview] Attempting to sign in with test user...');
      let signInAttempts = 0;
      let lastSignInError = null;

      while (signInAttempts < 3) {
        try {
          const result = await signIn(email, password);

          console.log('[AutoPreview] Sign in result:', {
            hasError: !!result?.error,
            hasSession: !!result?.data?.session,
            attempt: signInAttempts + 1,
          });

          // Check if sign-in returned an error
          if (result?.error) {
            const errorMsg = result.error.message || 'Sign-in failed';
            lastSignInError = new Error(errorMsg);
            signInAttempts++;

            console.warn(`[AutoPreview] Sign in attempt ${signInAttempts} failed:`, {
              error: errorMsg,
              retry: signInAttempts < 3,
            });

            // Wait before retrying
            if (signInAttempts < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            continue;
          }

          // Check if sign-in was successful
          if (result?.data?.session) {
            console.log('[AutoPreview] Sign in successful on attempt', signInAttempts + 1);
            setShowDemoPrompt(false);
            return;
          } else {
            throw new Error('No session returned from sign in');
          }
        } catch (signInErr) {
          lastSignInError = signInErr;
          signInAttempts++;

          console.warn(`[AutoPreview] Sign in exception attempt ${signInAttempts}:`, {
            error: signInErr.message,
            retry: signInAttempts < 3,
          });

          // Wait before retrying
          if (signInAttempts < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // All sign-in attempts failed
      const errorMsg = lastSignInError?.message || 'Sign-in failed after 3 attempts';
      const suggestion = isNewUser
        ? 'The test user was created but authentication failed. This might be a Supabase configuration issue.'
        : 'The test user exists but sign-in failed. Try clearing your browser storage and refreshing.';

      setError(`${errorMsg}\n\n${suggestion}`);
      console.error('[AutoPreview] All sign-in attempts failed:', lastSignInError);
    } catch (err) {
      const errorMsg = err.message || 'Failed to setup demo user';
      setError(`${errorMsg}\n\nPlease refresh the page and try again.`);
      console.error('[AutoPreview] Test user setup error:', err);
    }
  };

  // Demo/Auth prompt state with auto-setup
  useEffect(() => {
    // Auto-setup demo user in development if not authenticated
    if (showDemoPrompt && process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        console.log('[AutoPreview] Auto-starting demo user setup...');
        setupTestUser();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showDemoPrompt]);

  if (showDemoPrompt) {
    return (
      <div className="w-full bg-gradient-to-br from-amber-50 to-orange-100 rounded-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-4 animate-spin">
            <Github className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setting Up Preview</h2>
          <p className="text-gray-700 mb-6">
            Initializing demo account and starting preview...
          </p>

          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <p>This is a test user for development. In production, you'll use your own account.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Idle state - show start button
  if (previewState === 'idle') {
    return (
      <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">One-Click Preview</h2>
          <p className="text-gray-600 mb-6">
            Automatically detect package manager and start a live preview of your application
          </p>

          <div className="bg-white rounded-lg p-4 mb-6 text-left text-sm">
            <p className="font-semibold text-gray-900 mb-2">What happens next:</p>
            <ul className="space-y-1 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Detects your package manager (npm, pnpm, yarn)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>Creates package.json if needed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Installs dependencies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Starts your dev server</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">5.</span>
                <span>Gives you a live preview URL</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-2 flex-col">
            <button
              onClick={startPreview}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Start Automated Preview
            </button>
          </div>

          {effectiveOwner && effectiveRepo && (
            <div className="mt-4 p-3 bg-white rounded border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Repository</p>
              <p className="text-sm font-mono text-gray-900 flex items-center gap-2">
                <Github className="w-4 h-4 text-gray-600" />
                {effectiveOwner}/{effectiveRepo}@{effectiveBranch}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Starting state - show progress
  if (previewState === 'starting') {
    return (
      <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Zap className="w-8 h-8 text-blue-600 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Starting Preview</h2>
            <p className="text-gray-600">
              {elapsedTime}s elapsed • Setting up your development environment
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">Detecting environment...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div className="bg-blue-600 h-1 rounded-full" style={{
                width: `${Math.min(elapsedTime * 10, 90)}%`,
                transition: 'width 0.3s ease-in-out',
              }} />
            </div>
          </div>

          {effectiveOwner && effectiveRepo && (
            <div className="text-center text-sm">
              <p className="text-gray-600">
                <span className="font-mono">{effectiveOwner}/{effectiveRepo}</span> @ <span className="font-mono">{effectiveBranch}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Running state - show preview URL and controls
  if (previewState === 'running') {
    return (
      <div className="w-full">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-1">Preview Running</h3>
              <p className="text-sm text-green-700">
                Your application is live and ready to view
              </p>
            </div>
          </div>

          {previewData?.preview_url && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-600 mb-2">Preview URL</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={previewData.preview_url}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 font-mono text-sm rounded border border-gray-300"
                />
                <button
                  onClick={() => copyToClipboard(previewData.preview_url)}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          {previewData && (
            <div className="bg-white rounded-lg p-4 mb-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Package Manager</p>
                  <p className="font-mono font-semibold text-gray-900">
                    {previewData.package_manager || 'npm'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Port</p>
                  <p className="font-mono font-semibold text-gray-900">
                    {previewData.port || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={openPreview}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Preview
            </button>
            <button
              onClick={stopPreview}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Stop
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="bg-gray-100 rounded-lg overflow-hidden aspect-video">
          {previewData?.preview_url ? (
            <iframe
              src={previewData.preview_url}
              className="w-full h-full border-0"
              title="Live Preview"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <Loader className="w-8 h-8 text-gray-500 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (previewState === 'error') {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-1">Preview Failed</h3>
            <p className="text-sm text-red-700">{error || 'An error occurred while starting the preview'}</p>
          </div>
        </div>

        {previewData?.error_message && (
          <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
            <p className="text-xs font-mono text-red-900">{previewData.error_message}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={startPreview}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => setPreviewState('idle')}
            className="px-4 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Stopped state
  if (previewState === 'stopped') {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Preview Stopped</h3>
        <p className="text-gray-600 mb-6">Your preview has been stopped</p>
        <button
          onClick={() => setPreviewState('idle')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          Start New Preview
        </button>
      </div>
    );
  }

  return null;
}

export default AutoPreview;
