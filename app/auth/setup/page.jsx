'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, CheckCircle2, AlertCircle, Github, Database, Zap, ArrowRight } from 'lucide-react';
import { useIntegrations } from '@/lib/integrations-context';

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (err) {
    return null;
  }
}

function deriveSupabaseUrlFromKey(key) {
  try {
    const payload = decodeJWT(key);
    if (!payload) {
      return null;
    }

    let projectId = null;
    if (payload.sub && typeof payload.sub === 'string') {
      projectId = payload.sub.split('-')[0];
    }

    if (projectId && projectId.length > 0) {
      return `https://${projectId}.supabase.co`;
    }

    return null;
  } catch (err) {
    return null;
  }
}

export default function AuthSetupPage() {
  const router = useRouter();
  const { github, supabase } = useIntegrations();
  const [step, setStep] = useState('detection');
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseTables, setSupabaseTables] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState(null);

  // Auto-detect platform and fetch from environment
  useEffect(() => {
    const detectAndFetch = async () => {
      try {
        setLoading(true);

        // Detect platform from environment
        const response = await fetch('/api/env-config');
        if (!response.ok) throw new Error('Failed to detect platform');
        const config = await response.json();

        setDetectedPlatform({
          github: config.github_token ? 'GitHub' : null,
          supabase: config.supabase_url ? 'Supabase' : null,
          xai: config.x_api_key ? 'AI Service' : null,
        });

        // Auto-fill from environment
        if (config.github_token) {
          setGithubToken(config.github_token);
          github.setToken(config.github_token);
          await fetchRepositories(config.github_token);
        }

        if (config.supabase_url && config.supabase_anon_key) {
          setSupabaseUrl(config.supabase_url);
          setSupabaseKey(config.supabase_anon_key);
          supabase.setCredentials(config.supabase_url, config.supabase_anon_key);
        }

        setStep('integrations');
      } catch (err) {
        console.error('Auto-detection error:', err);
        setDetectedPlatform({});
        setStep('integrations');
      } finally {
        setLoading(false);
      }
    };

    detectAndFetch();
  }, [github, supabase]);

  const fetchRepositories = async (token) => {
    try {
      setLoadingRepos(true);
      const response = await fetch('/api/github/repos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch repositories');
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleGithubConnect = async (token) => {
    setGithubToken(token);
    github.setToken(token);
    await fetchRepositories(token);
    setError(null);
  };

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo);
    github.setRepository({
      owner: repo.owner,
      name: repo.name,
      id: repo.id,
      defaultBranch: repo.defaultBranch,
    });
  };

  const handleSupabaseConnect = async (key) => {
    try {
      if (!key.trim()) {
        setError('Please enter Supabase Anon Key');
        return;
      }

      // Derive URL from the anon key
      let derivedUrl = deriveSupabaseUrlFromKey(key);

      if (!derivedUrl) {
        setError('Could not derive Supabase project URL from the provided key. Please ensure you have provided a valid Supabase anon key.');
        return;
      }

      setSupabaseUrl(derivedUrl);
      setSupabaseKey(key);
      supabase.setCredentials(derivedUrl, key);
      setError(null);
    } catch (err) {
      setError('Failed to connect Supabase');
    }
  };

  const handleContinue = () => {
    if (selectedRepo) {
      router.push('/');
    } else {
      setError('Please select a repository to continue');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ROSERAM Builder</h1>
          <p className="text-blue-100 text-lg">AI-Powered Development Environment</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 font-medium">Detecting your environment...</p>
            </div>
          ) : (
            <>
              {/* Auto-Detected Services */}
              {step === 'integrations' && (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Integrations</h2>
                    <p className="text-gray-600">Connect your development tools and services</p>
                  </div>

                  <div className="p-8 space-y-6">
                    {/* Auto-Detected Display */}
                    {(detectedPlatform?.github || detectedPlatform?.supabase || detectedPlatform?.xai) && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Auto-Detected Services
                        </h3>
                        <div className="space-y-2 text-sm text-green-800">
                          {detectedPlatform?.github && (
                            <p>✓ <strong>GitHub</strong> - Environment variables detected</p>
                          )}
                          {detectedPlatform?.supabase && (
                            <p>✓ <strong>Supabase</strong> - Environment variables detected</p>
                          )}
                          {detectedPlatform?.xai && (
                            <p>✓ <strong>AI Service</strong> - Environment variables detected</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* GitHub Section */}
                    <div className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Github className="w-6 h-6 text-gray-900" />
                        <h3 className="text-lg font-bold text-gray-900">GitHub Repository</h3>
                        {githubToken && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                      </div>

                      {!githubToken ? (
                        <div className="space-y-3">
                          <input
                            type="password"
                            placeholder="Enter GitHub Personal Access Token"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-600">
                            Create a token at{' '}
                            <a
                              href="https://github.com/settings/tokens"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              github.com/settings/tokens
                            </a>
                            {' '}with 'repo' scope
                          </p>
                          <button
                            onClick={() => handleGithubConnect(githubToken)}
                            disabled={!githubToken.trim()}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                          >
                            Connect GitHub
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {loadingRepos ? (
                            <div className="flex items-center justify-center gap-2 py-4">
                              <Loader className="w-4 h-4 animate-spin" />
                              <span className="text-sm text-gray-600">Fetching repositories...</span>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600 mb-3">Select a repository ({repositories.length} found):</p>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {repositories.map((repo) => (
                                  <button
                                    key={repo.id}
                                    onClick={() => handleRepoSelect(repo)}
                                    className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                                      selectedRepo?.id === repo.id
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                  >
                                    <p className="font-semibold text-gray-900">{repo.name}</p>
                                    <p className="text-xs text-gray-600">
                                      {repo.fullName || `${repo.owner}/${repo.name}`}
                                      {repo.isPrivate && <span className="ml-2 text-red-600">🔒 Private</span>}
                                      {repo.isFork && <span className="ml-2 text-gray-500">⎇ Fork</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">{repo.description || 'No description'}</p>
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => setGithubToken('')}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                Change Token
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Supabase Section */}
                    <div className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Database className="w-6 h-6 text-gray-900" />
                        <h3 className="text-lg font-bold text-gray-900">Supabase Database</h3>
                        {supabaseUrl && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                      </div>

                      {!supabaseUrl ? (
                        <div className="space-y-3">
                          <input
                            type="password"
                            placeholder="Supabase Anon Key"
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-sm text-gray-600">Project URL will be automatically derived from your anon key</p>
                          <button
                            onClick={() => handleSupabaseConnect(supabaseKey)}
                            disabled={!supabaseKey.trim()}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                          >
                            Connect Supabase
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">Connected to Supabase</p>
                          <button
                            onClick={() => {
                              setSupabaseUrl('');
                              setSupabaseKey('');
                            }}
                            className="text-sm text-green-600 hover:underline"
                          >
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Continue Button */}
                    <button
                      onClick={handleContinue}
                      disabled={!selectedRepo}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                      Continue to Development Environment
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-blue-100">
          <p className="text-sm">
            © 2024 ROSERAM. Powered by Advanced AI
          </p>
        </div>
      </div>
    </div>
  );
}
