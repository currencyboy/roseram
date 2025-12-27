'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle, RefreshCw, ExternalLink, Loader, Globe, CheckCircle, Clock,
  Play, Zap, Github, Code2, Settings, ChevronRight, Copy, Info, ExternalLink as ExtLink
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { formatErrorMessage } from '@/lib/error-handler';

const SETUP_STEPS = {
  GITHUB_CONNECT: 'github-connect',
  SELECT_REPO: 'select-repo',
  SELECT_BRANCH: 'select-branch',
  REVIEW: 'review',
  DEPLOYING: 'deploying',
  RUNNING: 'running',
};

export function FlyPreview({
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

  // Deployment State
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [displayUrl, setDisplayUrl] = useState('/');
  const [iframeLoading, setIframeLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusPollingInterval, setStatusPollingInterval] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  const iframeRef = useRef(null);

  // Auto-load GitHub token from user_env_vars on mount
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
          console.log('[FlyPreview] GitHub token auto-loaded from user_env_vars');
        }
      } catch (err) {
        console.warn('[FlyPreview] Failed to auto-load GitHub token:', err);
      }
    };

    autoLoadGithubToken();
  }, []);

  // Step 1: Connect GitHub
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
      // Validate token
      const validateRes = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate-token', token: githubToken }),
      });

      const validateData = await validateRes.json();
      if (!validateData.valid) {
        throw new Error(validateData.error || 'Invalid token');
      }

      // Fetch repositories
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

  // Step 2: Select Repository and fetch branches
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
        // Auto-select default branch if available
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

  // Step 3: Confirm branch selection
  const handleConfirmBranch = () => {
    if (!selectedBranch) {
      setSetupError('Please select a branch');
      return;
    }
    setCurrentStep(SETUP_STEPS.REVIEW);
  };

  // Step 4: Start deployment
  const handleStartDeployment = async () => {
    if (!selectedRepo || !selectedBranch) {
      setSetupError('Missing required information. Please go back and complete all steps.');
      return;
    }

    if (!session?.access_token) {
      setSetupError('Your session has expired. Please sign in again.');
      return;
    }

    setCurrentStep(SETUP_STEPS.DEPLOYING);
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Create preview app record
      const response = await fetch(
        `/api/fly-preview?projectId=${projectId}&repo=${selectedRepo.owner}/${selectedRepo.name}&branch=${selectedBranch.name}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to provision preview app');
      }

      setApp(data.app);
      onStatusChange?.(data.app.status);

      // Trigger deployment
      try {
        const deployResponse = await fetch('/api/deploy-preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appId: data.app.id }),
      });

      const deployData = await deployResponse.json();
      if (!deployResponse.ok) {
        const errorMsg = formatErrorMessage(deployData.error, deployData.details);
        setErrorDetails(errorMsg);
        setError(deployData.error || 'Failed to trigger deployment');
        setCurrentStep(SETUP_STEPS.REVIEW);
        setLoading(false);
        return;
      }
    } catch (deployErr) {
      const errorMsg = formatErrorMessage('Deployment request failed', deployErr.message);
      setErrorDetails(errorMsg);
      setError(deployErr.message || 'Failed to trigger deployment');
      setCurrentStep(SETUP_STEPS.REVIEW);
      setLoading(false);
      return;
    }

      // Start polling
      if (data.app.status !== 'running' && data.app.status !== 'error') {
        startStatusPolling(data.app.id);
      } else {
        setCurrentStep(SETUP_STEPS.RUNNING);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to start preview app');
      setCurrentStep(SETUP_STEPS.REVIEW);
      setLoading(false);
    }
  };

  const startStatusPolling = (appId) => {
    let pollCount = 0;
    const maxPolls = 120;

    const interval = setInterval(async () => {
      pollCount++;

      try {
        const response = await fetch('/api/fly-preview', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ appId }),
        });

        const data = await response.json();

        if (response.ok && data.app) {
          setApp(data.app);
          onStatusChange?.(data.app.status);

          if (data.app.status === 'running') {
            clearInterval(interval);
            setCurrentStep(SETUP_STEPS.RUNNING);
            setLoading(false);
          } else if (data.app.status === 'error') {
            clearInterval(interval);
            setError(data.app.errorMessage || 'Deployment failed');
            setCurrentStep(SETUP_STEPS.REVIEW);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      if (pollCount >= maxPolls) {
        clearInterval(interval);
        setError('Deployment timeout. Please try again.');
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

  useEffect(() => {
    if (autoRefresh && refreshTrigger > 0) {
      setRefreshKey(prev => prev + 1);
    }
  }, [refreshTrigger, autoRefresh]);

  // Add keyboard shortcuts for refresh
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger in RUNNING state
      if (currentStep !== SETUP_STEPS.RUNNING) return;

      // Ctrl+Shift+R (or Cmd+Shift+R) for hard refresh
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        hardRefreshPage();
      }
      // Ctrl+R (or Cmd+R) for regular refresh
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'r') {
        e.preventDefault();
        refreshPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const navigateToPath = (path) => {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (!normalizedPath || normalizedPath === '') normalizedPath = '/';
    setCurrentPath(normalizedPath);
    setDisplayUrl(normalizedPath);
    onUrlChange?.(normalizedPath);
    setRefreshKey(prev => prev + 1);
  };

  const refreshPage = () => setRefreshKey(prev => prev + 1);

  const hardRefreshPage = () => {
    // Force a hard refresh by incrementing refresh key AND adding cache-busting param
    setRefreshKey(prev => prev + 1);
    // Also try to force iframe hard refresh via the ref
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.location.reload(true);
    }
  };

  const openInNewTab = () => {
    if (app?.previewUrl) {
      window.open(`${app.previewUrl}${currentPath}`, '_blank');
    }
  };

  // ===== RENDER STEPS =====

  // If user is not authenticated, show sign-in prompt
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
            You need to be signed in to use the preview feature. Please sign in to continue.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium">Preview requires authentication to:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• Access your GitHub repositories</li>
              <li>• Deploy to Fly.io</li>
              <li>• Manage preview instances</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Connect GitHub
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
                  setAutoLoadedToken(false);
                }}
                placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                {autoLoadedToken
                  ? 'Or enter a new token to replace the auto-loaded one'
                  : 'Token needs: repo (read), user (read)'}
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

  // Step 2: Select Repository
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
          <p className="text-gray-600 mb-6">
            Choose the repository you want to deploy
          </p>

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
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

  // Step 3: Select Branch
  if (currentStep === SETUP_STEPS.SELECT_BRANCH) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
        <div className="text-center max-w-md w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-xs">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-gray-600">GitHub</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-gray-600">Repository</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <Code2 className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-semibold">Branch</span>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Branch</h2>
          <p className="text-gray-600 mb-6">
            Choose the branch to deploy from {selectedRepo?.name}
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

  // Step 4: Review Configuration
  if (currentStep === SETUP_STEPS.REVIEW) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center max-w-md w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-xs">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <CheckCircle className="w-5 h-5 text-green-600" />
              <CheckCircle className="w-5 h-5 text-green-600" />
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Review & Launch Preview</h2>
          <p className="text-gray-600 mb-6">
            Ready to start your development environment on Fly.io?
          </p>

          <div className="bg-white rounded-lg p-6 border border-slate-200 space-y-4 text-left mb-6">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Repository</p>
              <p className="text-sm font-mono text-gray-900">{selectedRepo?.owner}/{selectedRepo?.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Branch</p>
              <p className="text-sm font-mono text-gray-900">{selectedBranch?.name}</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-left text-sm text-blue-800 mb-6">
            <p className="font-medium mb-2">What happens next:</p>
            <ol className="space-y-2 text-xs">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Your project type will be detected automatically</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>A Fly.io dev environment will be created (10-30 seconds)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Your dev server will start and be accessible via preview URL</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>You can push code changes and the preview will update</span>
              </li>
            </ol>
          </div>

          {error && errorDetails && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 space-y-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">{errorDetails.title}</p>
                  <p className="text-sm text-red-700 mt-1">{errorDetails.problem}</p>
                </div>
              </div>

              {errorDetails.solution && (
                <div className="bg-white rounded-lg p-4 border border-red-100 space-y-4">
                  <p className="font-medium text-gray-900 text-sm">How to fix this:</p>
                  {errorDetails.solution.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex gap-2 items-start">
                        <span className="font-semibold text-gray-700 text-sm">{item.step}</span>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                          >
                            Open <ExtLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <ul className="text-xs text-gray-700 space-y-1 ml-4">
                        {item.instructions.map((instruction, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-gray-400">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && !errorDetails && (
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
                setErrorDetails(null);
              }}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              Back
            </button>
            <button
              onClick={handleStartDeployment}
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

  // Step 5: Deploying
  if (currentStep === SETUP_STEPS.DEPLOYING) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Starting Dev Environment</h2>
          <p className="text-gray-600 mb-4">
            Booting Fly.io machine and starting your development server...
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
            {app?.appName && (
              <div className="border-t border-indigo-100 pt-3">
                <p className="text-xs text-gray-600 mb-1">Environment:</p>
                <p className="font-mono text-sm text-gray-900 break-all">{app.appName}</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
            <p className="font-medium mb-2">⚙️ What's happening:</p>
            <ul className="text-left space-y-1 text-xs">
              <li>• Detecting your project type</li>
              <li>• Creating preview contract</li>
              <li>• Installing dependencies (5-30 seconds)</li>
              <li>• Starting dev server</li>
              <li>• Exposing preview URL (10-30 seconds)</li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
            <p className="font-medium mb-2">💡 This is different from deployment:</p>
            <p>We're running your development environment live on Fly.io, not building/deploying. Your code runs as-is with hot reload when you make changes.</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 6: Running - Live Preview
  if (currentStep === SETUP_STEPS.RUNNING && app?.previewUrl) {
    const previewIframeUrl = `${app.previewUrl}${currentPath}`;

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
              title="Refresh preview (Ctrl+R)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={hardRefreshPage}
              className="p-2 hover:bg-gray-200 rounded transition-colors relative"
              title="Hard refresh - clears cache and forces full reload (Ctrl+Shift+R)"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
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

        {/* Info Footer */}
        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Preview: <span className="font-mono text-gray-900">{app.appName}</span></span>
            </div>
            <span className="text-gray-400 text-xs truncate">{app.previewUrl}</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback - No preview URL yet
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting for Preview</h2>
        <p className="text-gray-600">Your preview is being prepared. This should only take a moment.</p>
      </div>
    </div>
  );
}

export default FlyPreview;
