'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import RepositoryOnboardingFlow from '@/components/RepositoryOnboardingFlow';

/**
 * Example page showing how to use the RepositoryOnboardingFlow component
 * This demonstrates the complete Builder.io-style fork + deploy workflow
 */
export default function ForkAndDeployPage() {
  const [step, setStep] = useState('input'); // input, deploying, success
  const [formData, setFormData] = useState({
    sourceOwner: '',
    sourceRepo: '',
    gitHubToken: '',
    branch: 'main',
    region: 'cdg',
  });
  const [authToken, setAuthToken] = useState('');
  const [deploymentResult, setDeploymentResult] = useState(null);
  const [error, setError] = useState(null);
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [useStoredToken, setUseStoredToken] = useState(false);

  // Get auth token from session/context
  const getAuthToken = async () => {
    // TODO: Replace this with actual auth token from your auth system
    // This is a placeholder - get real token from Supabase session or your auth provider
    const token = localStorage.getItem('supabase_auth_token');
    if (!token) {
      setError('No authentication token found. Please sign in first.');
      return null;
    }
    return token;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.sourceOwner || !formData.sourceRepo) {
      setError('Repository owner and name are required');
      return;
    }

    if (!useStoredToken && !formData.gitHubToken) {
      setError('Please provide GitHub token or use your saved one');
      return;
    }

    // Get auth token
    const token = await getAuthToken();
    if (!token) {
      return;
    }

    setAuthToken(token);
    setStep('deploying');
  };

  // Check for stored token on mount
  React.useEffect(() => {
    const checkStoredToken = async () => {
      const token = await getAuthToken();
      if (token) {
        // Could check if user has stored token here
        // For now, we rely on the API to check
      }
    };
    checkStoredToken();
  }, []);

  const handleSuccess = (result) => {
    setDeploymentResult(result);
    setStep('success');
  };

  const handleError = (error) => {
    setError(error.message || 'Deployment failed');
  };

  const handleReset = () => {
    setStep('input');
    setFormData({
      sourceOwner: '',
      sourceRepo: '',
      gitHubToken: '',
      branch: 'main',
      region: 'cdg',
    });
    setError(null);
    setDeploymentResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fork & Deploy</h1>
            <p className="text-sm text-gray-600">Deploy any GitHub repository to Fly.io</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar - instructions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">How it works</h2>
              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Provide credentials</p>
                    <p className="text-gray-600 text-xs mt-1">Enter the GitHub repository and your personal access token</p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Fork repository</p>
                    <p className="text-gray-600 text-xs mt-1">We create a fork in your GitHub account</p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Deploy to Fly.io</p>
                    <p className="text-gray-600 text-xs mt-1">The app is automatically deployed and running</p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Live preview</p>
                    <p className="text-gray-600 text-xs mt-1">Edit the forked repo and preview changes instantly</p>
                  </div>
                </li>
              </ol>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-lg">⏱️</span>
                  <p>Takes 2-5 minutes to complete</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔒</span>
                  <p>Your token is not stored</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">💰</span>
                  <p>Free with your Fly.io account</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right content - form or deployment */}
          <div className="lg:col-span-2">
            {step === 'input' && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Deploy a Repository</h2>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* GitHub repository owner */}
                  <div>
                    <label htmlFor="sourceOwner" className="block text-sm font-semibold text-gray-900 mb-2">
                      Repository Owner
                    </label>
                    <input
                      type="text"
                      id="sourceOwner"
                      name="sourceOwner"
                      placeholder="e.g., facebook"
                      value={formData.sourceOwner}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">The GitHub user or organization that owns the repository</p>
                  </div>

                  {/* GitHub repository name */}
                  <div>
                    <label htmlFor="sourceRepo" className="block text-sm font-semibold text-gray-900 mb-2">
                      Repository Name
                    </label>
                    <input
                      type="text"
                      id="sourceRepo"
                      name="sourceRepo"
                      placeholder="e.g., react"
                      value={formData.sourceRepo}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">The name of the repository to fork and deploy</p>
                  </div>

                  {/* GitHub PAT or Stored Token */}
                  <div>
                    {hasStoredToken ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            id="useStoredToken"
                            checked={useStoredToken}
                            onChange={(e) => setUseStoredToken(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <label htmlFor="useStoredToken" className="text-sm font-semibold text-green-900">
                            Use saved GitHub token
                          </label>
                        </div>
                        <p className="text-xs text-green-700">
                          ✓ You have a saved GitHub token. Check the box to use it without entering it again.
                        </p>
                      </div>
                    ) : null}

                    {!useStoredToken && (
                      <div>
                        <label htmlFor="gitHubToken" className="block text-sm font-semibold text-gray-900 mb-2">
                          GitHub Personal Access Token
                        </label>
                        <input
                          type="password"
                          id="gitHubToken"
                          name="gitHubToken"
                          placeholder="github_pat_..."
                          value={formData.gitHubToken}
                          onChange={handleInputChange}
                          required={!useStoredToken}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Create a token at{' '}
                          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            github.com/settings/tokens
                          </a>{' '}
                          with repo scope
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Branch */}
                  <div>
                    <label htmlFor="branch" className="block text-sm font-semibold text-gray-900 mb-2">
                      Branch (Optional)
                    </label>
                    <input
                      type="text"
                      id="branch"
                      name="branch"
                      placeholder="main"
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: main</p>
                  </div>

                  {/* Region */}
                  <div>
                    <label htmlFor="region" className="block text-sm font-semibold text-gray-900 mb-2">
                      Fly.io Region (Optional)
                    </label>
                    <select
                      id="region"
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cdg">CDG (Paris, EU)</option>
                      <option value="iad">IAD (Ashburn, US)</option>
                      <option value="lax">LAX (Los Angeles, US)</option>
                      <option value="lhr">LHR (London, EU)</option>
                      <option value="nrt">NRT (Tokyo, JP)</option>
                      <option value="syd">SYD (Sydney, AU)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Default: CDG (Paris)</p>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Start Deployment
                  </button>
                </form>
              </div>
            )}

            {step === 'deploying' && (
              <RepositoryOnboardingFlow
                authToken={authToken}
                sourceOwner={formData.sourceOwner}
                sourceRepo={formData.sourceRepo}
                gitHubToken={useStoredToken ? undefined : formData.gitHubToken}
                branch={formData.branch}
                region={formData.region}
                projectId={null}
                hasStoredToken={hasStoredToken}
                onSuccess={handleSuccess}
                onError={handleError}
                onTokenStored={() => {
                  setHasStoredToken(true);
                  // Show message that token was stored
                }}
              />
            )}

            {step === 'success' && deploymentResult && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-gray-900">Deployment Complete!</h2>
                    <p className="text-gray-600 mt-2">Your application is now live on Fly.io</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Forked Repository</p>
                      <a
                        href={deploymentResult.fork.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all mt-1"
                      >
                        {deploymentResult.fork.url}
                      </a>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">Preview URL</p>
                      <a
                        href={deploymentResult.deployment.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all mt-1"
                      >
                        {deploymentResult.deployment.previewUrl}
                      </a>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">App Name</p>
                      <code className="text-sm bg-white rounded px-2 py-1 border border-gray-300 block mt-1 font-mono">
                        {deploymentResult.deployment.appName}
                      </code>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">Region</p>
                      <p className="text-sm text-gray-600 mt-1">{deploymentResult.deployment.region.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <a
                      href={deploymentResult.deployment.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-center transition-colors"
                    >
                      Open Preview
                    </a>
                    <a
                      href={deploymentResult.fork.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg text-center transition-colors"
                    >
                      View Fork
                    </a>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full text-gray-600 hover:text-gray-900 font-semibold py-3"
                  >
                    Deploy Another Repository
                  </button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm text-blue-900">
                    <p className="font-semibold">Next steps:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Edit code in your forked repository</li>
                      <li>Commit and push changes</li>
                      <li>Fly.io will automatically redeploy</li>
                      <li>See live updates in your preview</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
