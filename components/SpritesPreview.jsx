'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle, RefreshCw, ExternalLink, Loader, Globe, CheckCircle, Clock,
  Play, Zap, Github, Code2, Settings, ChevronRight, Copy, Info, Trash2
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { formatErrorMessage } from '@/lib/error-handler';

const SETUP_STEPS = {
  GITHUB_CONNECT: 'github-connect',
  SELECT_REPO: 'select-repo',
  SELECT_BRANCH: 'select-branch',
  REVIEW: 'review',
  LAUNCHING: 'launching',
  RUNNING: 'running',
};

export function SpritesPreview({
  projectId,
  autoRefresh = true,
  onUrlChange,
  refreshTrigger = 0,
  onStatusChange,
  autoStart = false,
}) {
  const { session } = useAuth();

  // Setup Wizard State
  const [currentStep, setCurrentStep] = useState(SETUP_STEPS.GITHUB_CONNECT);
  const [githubToken, setGithubToken] = useState('');
  const [githubRepos, setGithubRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoBranches, setRepoBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [autoLoadedToken, setAutoLoadedToken] = useState(false);

  // Preview State
  const [sprite, setSprite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [displayUrl, setDisplayUrl] = useState('/');
  const [iframeLoading, setIframeLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusPollingInterval, setStatusPollingInterval] = useState(null);
  const iframeRef = useRef(null);

  // Auto-load GitHub token
  useEffect(() => {
    const autoLoadGithubToken = async () => {
      try {
        const response = await fetch('/api/integrations/load-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          console.warn('Failed to load integrations');
          return;
        }

        const data = await response.json();
        if (data.success && data.github?.token) {
          setGithubToken(data.github.token);
          setAutoLoadedToken(true);
          console.log('[SpritesPreview] GitHub token auto-loaded');
        }
      } catch (err) {
        console.warn('[SpritesPreview] Failed to auto-load GitHub token:', err);
      }
    };

    autoLoadGithubToken();
  }, []);

  // Handle GitHub connection
  const handleGithubConnect = async () => {
    if (!githubToken.trim()) {
      setSetupError('Please enter a GitHub token');
      return;
    }

    if (!githubToken.startsWith('ghp_') && !githubToken.startsWith('github_pat_')) {
      setSetupError('Invalid token format. Tokens should start with "ghp_" or "github_pat_"');
      return;
    }

    setSetupLoading(true);
    setSetupError(null);

    try {
      const validateRes = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate-token', token: githubToken }),
      });

      const validateData = await validateRes.json();
      if (!validateData.valid) {
        throw new Error(validateData.error || 'Invalid token');
      }

      const reposRes = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-repos', token: githubToken }),
      });

      const reposData = await reposRes.json();
      if (reposData.success && reposData.repositories) {
        setGithubRepos(reposData.repositories);
        setCurrentStep(SETUP_STEPS.SELECT_REPO);
      } else {
        throw new Error(reposData.error || 'Failed to fetch repositories');
      }
    } catch (err) {
      setSetupError(err.message || 'Failed to connect GitHub');
    } finally {
      setSetupLoading(false);
    }
  };

  // Select repository
  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    setSetupLoading(true);
    setSetupError(null);

    try {
      const branchesRes = await fetch('/api/github/list-all-branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          token: githubToken,
        }),
      });

      const branchesData = await branchesRes.json();
      if (branchesData.success && branchesData.branches) {
        setRepoBranches(branchesData.branches);
        const defaultBranch = branchesData.branches.find(b => b.name === repo.defaultBranch);
        setSelectedBranch(defaultBranch || branchesData.branches[0]);
        setCurrentStep(SETUP_STEPS.SELECT_BRANCH);
      } else {
        throw new Error(branchesData.error || 'Failed to fetch branches');
      }
    } catch (err) {
      setSetupError(err.message || 'Failed to fetch branches');
      setSelectedRepo(null);
    } finally {
      setSetupLoading(false);
    }
  };

  // Confirm branch
  const handleConfirmBranch = () => {
    if (!selectedBranch) {
      setSetupError('Please select a branch');
      return;
    }
    setCurrentStep(SETUP_STEPS.REVIEW);
  };

  // Launch sprite
  const handleLaunchSprite = async () => {
    if (!selectedRepo || !selectedBranch) {
      setSetupError('Missing required information');
      return;
    }

    if (!session?.access_token) {
      setSetupError('Your session has expired. Please sign in again.');
      return;
    }

    setCurrentStep(SETUP_STEPS.LAUNCHING);
    setLoading(true);
    setError(null);

    try {
      // Provision sprite
      const response = await fetch(
        `/api/sprites-preview?projectId=${projectId}&repo=${selectedRepo.owner}/${selectedRepo.name}&branch=${selectedBranch.name}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to provision sprite');
      }

      setSprite(data.sprite);
      onStatusChange?.(data.sprite.status);

      // Start polling for status
      if (data.sprite.status !== 'running' && data.sprite.status !== 'error') {
        startStatusPolling(data.sprite.id);
      } else {
        setCurrentStep(SETUP_STEPS.RUNNING);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to launch sprite');
      setCurrentStep(SETUP_STEPS.REVIEW);
      setLoading(false);
    }
  };

  // Poll for sprite status
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
          setSprite(data.sprite);
          onStatusChange?.(data.sprite.status);

          if (data.sprite.status === 'running') {
            clearInterval(interval);
            setCurrentStep(SETUP_STEPS.RUNNING);
            setLoading(false);
          } else if (data.sprite.status === 'error') {
            clearInterval(interval);
            setError(data.sprite.errorMessage || 'Sprite provisioning failed');
            setCurrentStep(SETUP_STEPS.REVIEW);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      if (pollCount >= maxPolls) {
        clearInterval(interval);
        setError('Sprite provisioning timeout. Please try again.');
        setCurrentStep(SETUP_STEPS.REVIEW);
        setLoading(false);
      }
    }, 5000);

    setStatusPollingInterval(interval);
  };

  useEffect(() => {
    return () => {
      if (statusPollingInterval) clearInterval(statusPollingInterval);
    };
  }, [statusPollingInterval]);

  // Cleanup
  useEffect(() => {
    if (autoRefresh && refreshTrigger > 0) {
      setRefreshKey(prev => prev + 1);
    }
  }, [refreshTrigger, autoRefresh]);

  const navigateToPath = (path) => {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (!normalizedPath || normalizedPath === '') normalizedPath = '/';
    setCurrentPath(normalizedPath);
    setDisplayUrl(normalizedPath);
    onUrlChange?.(normalizedPath);
    setRefreshKey(prev => prev + 1);
  };

  const refreshPage = () => setRefreshKey(prev => prev + 1);
  
  const openInNewTab = () => {
    if (sprite?.previewUrl) {
      window.open(`${sprite.previewUrl}${currentPath}`, '_blank');
    }
  };

  const destroySprite = async () => {
    if (!sprite) return;

    if (!window.confirm('Destroy this preview? This cannot be undone.')) {
      return;
    }

    try {
      await fetch(`/api/sprites-preview?spriteId=${sprite.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      setSprite(null);
      setCurrentStep(SETUP_STEPS.REVIEW);
    } catch (err) {
      setError('Failed to destroy sprite: ' + err.message);
    }
  };

  // Not authenticated
  if (!session) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to use the preview feature.
          </p>
        </div>
      </div>
    );
  }

  // GitHub Connect
  if (currentStep === SETUP_STEPS.GITHUB_CONNECT) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center max-w-md w-full">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto">
              <Github className="w-8 h-8 text-slate-600" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Connect GitHub</h2>
          <p className="text-gray-600 mb-6">
            {autoLoadedToken
              ? 'Your GitHub token has been auto-loaded. Click below to proceed.'
              : 'Provide your GitHub token to access your repositories'}
          </p>

          <div className="bg-white rounded-lg p-6 border border-slate-200 space-y-4">
            {autoLoadedToken && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">GitHub token loaded from your saved credentials</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  setSetupError(null);
                }}
                placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Token needs: repo (read), user (read)
              </p>
            </div>

            {setupError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{setupError}</p>
              </div>
            )}

            <button
              onClick={handleGithubConnect}
              disabled={setupLoading || !githubToken}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {setupLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  {autoLoadedToken ? 'Use Saved Token' : 'Connect GitHub'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Select Repository
  if (currentStep === SETUP_STEPS.SELECT_REPO) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
        <div className="text-center max-w-md w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
                <Github className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
              <div className="w-12 h-12 bg-blue-100 rounded-full shadow-lg flex items-center justify-center">
                <Code2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Repository</h2>
          <p className="text-gray-600 mb-6">Choose the repository you want to preview</p>

          {setupError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{setupError}</p>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {githubRepos.length === 0 ? (
              <p className="text-gray-500 py-4">No repositories found</p>
            ) : (
              githubRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  disabled={setupLoading}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{repo.name}</p>
                      <p className="text-xs text-gray-500">{repo.owner}</p>
                    </div>
                    {setupLoading && selectedRepo?.id === repo.id && (
                      <Loader className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => {
              setCurrentStep(SETUP_STEPS.GITHUB_CONNECT);
              setGithubToken('');
              setGithubRepos([]);
            }}
            className="w-full mt-4 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Select Branch
  if (currentStep === SETUP_STEPS.SELECT_BRANCH) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
        <div className="text-center max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Branch</h2>
          <p className="text-gray-600 mb-6">
            Choose the branch to preview from {selectedRepo?.name}
          </p>

          {setupError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{setupError}</p>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {repoBranches.length === 0 ? (
              <p className="text-gray-500 py-4">No branches found</p>
            ) : (
              repoBranches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => setSelectedBranch(branch)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedBranch?.name === branch.name
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedBranch?.name === branch.name && (
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{branch.name}</p>
                      {branch.name === selectedRepo?.defaultBranch && (
                        <p className="text-xs text-gray-500">Default branch</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setCurrentStep(SETUP_STEPS.SELECT_REPO);
                setRepoBranches([]);
              }}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              Back
            </button>
            <button
              onClick={handleConfirmBranch}
              disabled={!selectedBranch}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Review
  if (currentStep === SETUP_STEPS.REVIEW) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Launch</h2>
          <p className="text-gray-600 mb-6">
            Your preview will run in an isolated Sprites container
          </p>

          <div className="bg-white rounded-lg p-6 border border-slate-200 space-y-4 text-left mb-6">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Repository</p>
              <p className="text-sm font-mono text-gray-900">{selectedRepo?.owner}/{selectedRepo?.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Branch</p>
              <p className="text-sm font-mono text-gray-900">{selectedBranch?.name}</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-left text-sm text-blue-800 mb-6">
            <p className="font-medium mb-2">What happens next:</p>
            <ol className="space-y-2 text-xs">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Repository is cloned in an isolated container</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>Dependencies are installed (npm install)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Dev server starts (npm run dev)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>Preview URL becomes available (1-5 minutes)</span>
              </li>
            </ol>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentStep(SETUP_STEPS.SELECT_BRANCH);
                setError(null);
              }}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              Back
            </button>
            <button
              onClick={handleLaunchSprite}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Launch Preview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Launching
  if (currentStep === SETUP_STEPS.LAUNCHING) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Launching Preview</h2>
          <p className="text-gray-600 mb-4">
            Setting up your Sprites container and starting the dev server...
          </p>

          <div className="bg-white rounded-lg p-4 border border-indigo-100 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Repository</p>
              <p className="font-semibold text-gray-900">{selectedRepo?.name}</p>
            </div>
            <div className="border-t border-indigo-100 pt-3">
              <p className="text-xs text-gray-600 mb-1 font-semibold">Branch:</p>
              <p className="font-mono text-sm text-gray-900">{selectedBranch?.name}</p>
            </div>
            {sprite?.spriteName && (
              <div className="border-t border-indigo-100 pt-3">
                <p className="text-xs text-gray-600 mb-1">Sprite:</p>
                <p className="font-mono text-sm text-gray-900 break-all">{sprite.spriteName}</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
            <p className="font-medium mb-2">⚙️ What's happening:</p>
            <ul className="text-left space-y-1 text-xs">
              <li>• Creating Sprites container</li>
              <li>• Cloning repository</li>
              <li>• Installing dependencies</li>
              <li>• Starting dev server</li>
              <li>• Waiting for port to open</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Running
  if (currentStep === SETUP_STEPS.RUNNING && sprite?.previewUrl) {
    const previewIframeUrl = `${sprite.previewUrl}${currentPath}`;

    return (
      <div className="flex flex-col w-full h-full bg-white overflow-hidden">
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
              onClick={destroySprite}
              className="p-2 hover:bg-red-100 rounded transition-colors text-red-600"
              title="Stop preview"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          {iframeLoading && (
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
            src={previewIframeUrl}
            className="w-full h-full border-0 bg-white"
            title="Live Preview"
            onLoad={() => setIframeLoading(false)}
            onLoadStart={() => setIframeLoading(true)}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
          />
        </div>

        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Sprites: <span className="font-mono text-gray-900">{sprite.spriteName}</span></span>
            </div>
            <span className="text-gray-400 text-xs truncate">{sprite.previewUrl}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default SpritesPreview;
