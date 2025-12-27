'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Clock, GitFork, Server, Zap } from 'lucide-react';

const STEPS = [
  { id: 'initialize', label: 'Initializing', icon: Clock, order: 1 },
  { id: 'fork_start', label: 'Forking Repository', icon: GitFork, order: 2 },
  { id: 'fork_complete', label: 'Repository Forked', icon: CheckCircle2, order: 3 },
  { id: 'branch_create', label: 'Creating Branch', icon: Zap, order: 4 },
  { id: 'branch_ready', label: 'Branch Ready', icon: CheckCircle2, order: 5 },
  { id: 'deploy_start', label: 'Deploying to Fly.io', icon: Server, order: 6 },
  { id: 'deploy_submitted', label: 'Building & Starting', icon: Clock, order: 7 },
  { id: 'polling', label: 'Starting Preview', icon: Clock, order: 8 },
  { id: 'deployed', label: 'Preview Live', icon: CheckCircle2, order: 9 },
];

/**
 * RepositoryOnboardingFlow
 *
 * Complete UI for repository fork + deploy workflow
 * Integrates with /api/repository/fork-and-deploy endpoint
 *
 * Props:
 * - authToken: Supabase auth token
 * - sourceOwner: Original repo owner
 * - sourceRepo: Original repo name
 * - gitHubToken: User's GitHub PAT (optional - will check stored)
 * - onSuccess: Callback when deployment completes
 * - onError: Callback on error
 * - branch: Branch to deploy (default: main)
 * - region: Fly.io region (default: cdg)
 * - projectId: Associated project ID (optional)
 * - hasStoredToken: Whether user has a stored GitHub token
 * - onTokenStored: Callback when token is stored for future use
 */
export default function RepositoryOnboardingFlow({
  authToken,
  sourceOwner,
  sourceRepo,
  gitHubToken,
  onSuccess,
  onError,
  branch = 'main',
  region = 'cdg',
  projectId = null,
  hasStoredToken = false,
  onTokenStored = null,
}) {
  const [state, setState] = useState({
    isLoading: false,
    currentStep: null,
    currentMessage: '',
    progress: 0,
    error: null,
    result: null,
    storeToken: false,
    deploymentData: {
      forkUrl: null,
      appName: null,
      previewUrl: null,
      deploymentId: null,
    },
  });

  /**
   * Start the fork and deploy workflow
   */
  const handleStartWorkflow = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      result: null,
      currentStep: 'initialize',
      progress: 5,
      currentMessage: 'Initializing fork and deploy process...',
    }));

    try {
      const response = await fetch('/api/repository/fork-and-deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...(gitHubToken && { gitHubToken }),
          sourceOwner,
          sourceRepo,
          branch,
          region,
          projectId,
          storeToken: state.storeToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to start deployment');
      }

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          currentStep: 'deployed',
          progress: 100,
          currentMessage: 'Preview is live!',
          result: data,
          deploymentData: {
            forkUrl: data.fork.url,
            appName: data.deployment.appName,
            previewUrl: data.deployment.previewUrl,
            deploymentId: data.deployment.deploymentId,
          },
        }));

        // Notify if token was stored
        if (data.tokenStored && onTokenStored) {
          onTokenStored();
        }

        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'An error occurred during deployment';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        currentStep: 'error',
      }));

      if (onError) {
        onError(error);
      }
    }
  }, [authToken, sourceOwner, sourceRepo, gitHubToken, branch, region, projectId, state.storeToken, onSuccess, onError, onTokenStored]);

  /**
   * Reset the workflow state
   */
  const handleReset = useCallback(() => {
    setState({
      isLoading: false,
      currentStep: null,
      currentMessage: '',
      progress: 0,
      error: null,
      result: null,
      storeToken: false,
      deploymentData: {
        forkUrl: null,
        appName: null,
        previewUrl: null,
        deploymentId: null,
      },
    });
  }, []);

  /**
   * Open the preview in a new tab
   */
  const handleOpenPreview = useCallback(() => {
    if (state.deploymentData.previewUrl) {
      window.open(state.deploymentData.previewUrl, '_blank');
    }
  }, [state.deploymentData.previewUrl]);

  /**
   * Open the fork on GitHub
   */
  const handleOpenFork = useCallback(() => {
    if (state.deploymentData.forkUrl) {
      window.open(state.deploymentData.forkUrl, '_blank');
    }
  }, [state.deploymentData.forkUrl]);

  // Initial state - not started
  if (!state.isLoading && !state.currentStep && !state.error && !state.result) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GitFork className="w-6 h-6 text-blue-600" />
              Deploy {sourceRepo}
            </h2>
            <p className="text-gray-600 mt-2">
              We'll fork {sourceOwner}/{sourceRepo} and deploy it to Fly.io for you.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>What happens next:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
              <li>Repository is forked to your GitHub account</li>
              <li>Branch "<strong>{branch}</strong>" is created/synced</li>
              <li>App is deployed to Fly.io region <strong>{region}</strong></li>
              <li>Live preview becomes available in your browser</li>
            </ul>
          </div>

          {/* Token storage option */}
          {gitHubToken && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.storeToken}
                  onChange={(e) => setState(prev => ({ ...prev, storeToken: e.target.checked }))}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm text-green-900">
                  <strong>Save GitHub token</strong> for future deployments
                  <p className="text-xs text-green-700 mt-0.5">You won't need to paste it again after logout/login</p>
                </span>
              </label>
            </div>
          )}

          {/* Stored token indicator */}
          {hasStoredToken && !gitHubToken && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900">
                ✓ <strong>Saved token detected</strong>
              </p>
              <p className="text-xs text-purple-700 mt-1">We'll use your stored GitHub token for this deployment</p>
            </div>
          )}

          <button
            onClick={handleStartWorkflow}
            disabled={state.isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Start Deployment
          </button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 This usually takes 2-5 minutes</p>
            <p>🔒 {gitHubToken ? 'Optionally store for future use' : 'Using stored credentials'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border border-red-200 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Deployment Failed</h3>
              <p className="text-red-700 mt-2">{state.error}</p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (state.result && state.currentStep === 'deployed') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border border-green-200 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-900">Deployment Successful! 🎉</h3>
              <p className="text-green-700 mt-1">Your preview is now live</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-green-900">App Name</p>
              <code className="text-sm bg-white rounded px-2 py-1 border border-green-200 block mt-1 font-mono">
                {state.deploymentData.appName}
              </code>
            </div>

            {state.deploymentData.previewUrl && (
              <div>
                <p className="text-sm font-semibold text-green-900">Preview URL</p>
                <code className="text-sm bg-white rounded px-2 py-1 border border-green-200 block mt-1 font-mono truncate">
                  {state.deploymentData.previewUrl}
                </code>
              </div>
            )}

            {state.deploymentData.forkUrl && (
              <div>
                <p className="text-sm font-semibold text-green-900">Forked Repository</p>
                <code className="text-sm bg-white rounded px-2 py-1 border border-green-200 block mt-1 font-mono truncate">
                  {state.deploymentData.forkUrl}
                </code>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleOpenPreview}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Open Preview
            </button>
            <button
              onClick={handleOpenFork}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <GitFork className="w-4 h-4" />
              View Fork
            </button>
          </div>

          <button
            onClick={handleReset}
            className="w-full text-gray-600 hover:text-gray-900 font-semibold py-2"
          >
            Deploy Another Repository
          </button>
        </div>
      </div>
    );
  }

  // Progress state
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deployment in Progress</h2>
          <p className="text-gray-600 mt-2">Forking and deploying {sourceRepo}...</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-gray-600">{state.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Current status message */}
        {state.currentMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="font-semibold text-blue-900">{state.currentMessage}</p>
                <p className="text-sm text-blue-700 mt-1">This may take a few minutes...</p>
              </div>
            </div>
          </div>
        )}

        {/* Steps overview */}
        <div className="space-y-2">
          {STEPS.slice(0, 5).map((step, idx) => {
            const stepOrder = step.order;
            const currentOrder = state.currentStep ? STEPS.find(s => s.id === state.currentStep)?.order || 0 : 0;
            const isActive = stepOrder === currentOrder;
            const isCompleted = stepOrder < currentOrder;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCompleted ? 'bg-green-50 border border-green-200' :
                  isActive ? 'bg-blue-50 border border-blue-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : isActive ? (
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 animate-spin" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <span
                  className={`text-sm font-medium ${
                    isCompleted ? 'text-green-900' :
                    isActive ? 'text-blue-900' :
                    'text-gray-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>🔄 Status updates automatically</p>
          <p>💾 Forked repo: {sourceOwner}/{sourceRepo}</p>
          <p>🌍 Deploying to Fly.io ({region})</p>
        </div>
      </div>
    </div>
  );
}
