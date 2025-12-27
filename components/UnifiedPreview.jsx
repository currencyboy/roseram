'use client';

import React, { useState, useEffect } from 'react';
import { Github, Loader, AlertCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { AutoSpritesPreview } from './AutoSpritesPreview';

/**
 * Unified Preview Component
 * - Detects user's GitHub repositories
 * - Shows simple repository selector
 * - Automatically starts preview for selected repository
 * - Clean, minimal UI
 */
export function UnifiedPreview({ projectId, onIntegrationNeeded }) {
  const { session } = useAuth();
  const [step, setStep] = useState('loading'); // loading, select, previewing
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [error, setError] = useState(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubToken, setGithubToken] = useState(null);

  // Load repositories on mount
  useEffect(() => {
    console.log('[UnifiedPreview] useEffect triggered:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
    });

    if (session?.access_token) {
      loadRepositories();
    } else {
      console.log('[UnifiedPreview] Waiting for session...');
      setStep('loading');
    }
  }, [session?.access_token]);

  const loadRepositories = async () => {
    if (!session?.access_token) {
      console.log('[UnifiedPreview] No access token, skipping repo load');
      setStep('loading');
      return;
    }

    console.log('[UnifiedPreview] Loading repositories...');
    setLoadingRepos(true);
    setError(null);

    try {
      // Try to get GitHub integration
      console.log('[UnifiedPreview] Fetching integrations...');
      const integrationsRes = await fetch('/api/integrations/load-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      let token = null;
      if (integrationsRes.ok) {
        const integrations = await integrationsRes.json();
        console.log('[UnifiedPreview] Integrations loaded:', {
          hasGithubToken: !!integrations.github?.token,
          hasRepository: !!integrations.github?.repository,
        });

        token = integrations.github?.token;
        if (integrations.github?.repository) {
          // Pre-select configured repository
          const repo = typeof integrations.github.repository === 'string'
            ? JSON.parse(integrations.github.repository)
            : integrations.github.repository;
          console.log('[UnifiedPreview] Pre-selecting repo:', { owner: repo.owner, name: repo.name });
          setSelectedRepo(repo);
        }
      } else {
        console.warn('[UnifiedPreview] Integrations fetch failed:', integrationsRes.status);
      }

      if (!token) {
        console.log('[UnifiedPreview] No GitHub token, prompting for integration');
        setStep('loading');
        onIntegrationNeeded?.();
        return;
      }

      setGithubToken(token);

      // Fetch repositories
      console.log('[UnifiedPreview] Fetching repositories with GitHub token...');
      const reposRes = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-repos',
          token,
        }),
      });

      console.log('[UnifiedPreview] Repos fetch status:', reposRes.status);

      if (reposRes.ok) {
        const data = await reposRes.json();
        console.log('[UnifiedPreview] Repos fetched:', {
          success: data.success,
          count: data.repositories?.length,
        });

        if (data.success && data.repositories) {
          setRepositories(data.repositories);
          setStep('select');

          // Auto-select if only one repo
          if (data.repositories.length === 1) {
            console.log('[UnifiedPreview] Auto-selecting single repo');
            setSelectedRepo(data.repositories[0]);
            setStep('previewing');
          }
        } else {
          throw new Error(data.error || 'Failed to fetch repositories');
        }
      } else {
        const errorData = await reposRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Repos fetch failed (${reposRes.status})`);
      }
    } catch (err) {
      console.error('[UnifiedPreview] Error loading repositories:', err);
      let errorMsg = err.message || 'Failed to load repositories';

      // Check if it's a database setup error
      if (errorMsg.includes('not initialized') || errorMsg.includes('setup-auto-preview-schema')) {
        errorMsg = 'Database setup required. Please run: scripts/setup-auto-preview-schema.sql in your Supabase SQL Editor.';
      }

      setError(errorMsg);
      setStep('loading');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
    setStep('previewing');
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-2">Setting up preview...</p>
          <p className="text-gray-600 text-sm mb-6">Waiting for GitHub integration and repositories...</p>

          <div className="bg-white rounded-lg p-4 text-left text-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span className="text-gray-600">Checking authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span className="text-gray-600">Loading GitHub repositories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span className="text-gray-600">Preparing preview environment</span>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded text-left">
              <p className="text-sm text-red-800 font-medium mb-2">Setup issue:</p>
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadRepositories();
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Repository selection
  if (step === 'select') {
    return (
      <div className="flex flex-col h-full p-6 bg-gray-50 overflow-auto">
        <div className="max-w-2xl w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Github className="w-6 h-6 text-blue-600" />
              Select Repository
            </h2>
            <p className="text-gray-600">Choose a repository to preview</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={loadRepositories}
                className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {loadingRepos ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="ml-3 text-gray-600">Loading repositories...</p>
            </div>
          ) : repositories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <Github className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No repositories found</p>
              <p className="text-sm text-gray-500 mb-4">Make sure your GitHub account has at least one repository.</p>
              <button
                onClick={loadRepositories}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {repositories.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    console.log('[UnifiedPreview] Selected repo:', repo.name);
                    handleRepoSelect(repo);
                  }}
                  className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {repo.owner?.login || repo.owner}/{repo.name}
                      </h3>
                      {repo.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    {repo.language && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded ml-2 flex-shrink-0">
                        {repo.language}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Previewing state
  if (step === 'previewing' && selectedRepo) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AutoSpritesPreview
            projectId={projectId}
            owner={selectedRepo.owner?.login || selectedRepo.owner}
            repo={selectedRepo.name}
            branch={selectedRepo.default_branch || 'main'}
            onError={(err) => {
              console.error('[UnifiedPreview] Preview error:', err);
              setError(typeof err === 'string' ? err : err.message);
              setStep('select');
            }}
            onReady={() => {
              console.log('[UnifiedPreview] Preview ready');
              setError(null);
            }}
          />
        </div>
        <button
          onClick={() => setStep('select')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to repositories
        </button>
      </div>
    );
  }

  return null;
}

export default UnifiedPreview;
