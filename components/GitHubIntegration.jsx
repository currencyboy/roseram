"use client";

import { useState, useEffect } from "react";
import { Loader, Check, AlertCircle } from "lucide-react";

export function GitHubIntegration({ onRepositorySelected, onTokenSet, isComplete, preloadedToken }) {
  const [token, setToken] = useState(preloadedToken || "");
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (preloadedToken) {
      setToken(preloadedToken);
      setError(null);
      setRepositories([]);
      setSelectedRepo(null);
      // Auto-fetch repositories when a new token is preloaded
      setTimeout(() => {
        autoFetchRepositories(preloadedToken);
      }, 100);
    }
  }, [preloadedToken]);

  const autoFetchRepositories = async (tokenToUse) => {
    if (!tokenToUse.trim()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('[GitHubIntegration] Auto-fetching repositories with token:', tokenToUse.substring(0, 20) + '...');
      
      const response = await fetch("/api/integrations/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get-repos",
          token: tokenToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[GitHubIntegration] API error response:', errorData);
        
        if (response.status === 401) {
          throw new Error("GitHub token is invalid or expired");
        }
        throw new Error(errorData.error || `Failed to fetch repositories (${response.status})`);
      }

      const data = await response.json();

      console.log('[GitHubIntegration] API Response:', {
        success: data.success,
        repoCount: data.repositories?.length || 0,
        error: data.error,
      });

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch repositories");
      }

      const repos = data.repositories || [];
      console.log(`[GitHubIntegration] Fetched ${repos.length} repositories`);
      
      if (repos.length === 0) {
        throw new Error('No repositories found. Make sure your GitHub token has "repo" scope and you have at least one repository.');
      }
      
      console.log('[GitHubIntegration] Sample repos:', repos.slice(0, 3).map(r => r.full_name || r.name));
      setRepositories(repos);
      
      if (onTokenSet) {
        onTokenSet(tokenToUse);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch repositories";
      console.error("[GitHubIntegration] Error fetching repositories:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchRepos = async () => {
    if (!token.trim()) {
      setError("Please enter a GitHub token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[GitHubIntegration] Manual fetch with token:', token.substring(0, 20) + '...');
      
      const response = await fetch("/api/integrations/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get-repos",
          token: token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[GitHubIntegration] API error response:', errorData);
        
        if (response.status === 401) {
          throw new Error("GitHub token is invalid or expired");
        }
        throw new Error(errorData.error || `Failed to fetch repositories (${response.status})`);
      }

      const data = await response.json();

      console.log('[GitHubIntegration] API Response:', {
        success: data.success,
        repoCount: data.repositories?.length || 0,
        error: data.error,
      });

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch repositories");
      }

      const repos = data.repositories || [];
      console.log(`[GitHubIntegration] Fetched ${repos.length} repositories`);
      
      if (repos.length === 0) {
        throw new Error('No repositories found. Make sure your GitHub token has "repo" scope and you have at least one repository.');
      }
      
      console.log('[GitHubIntegration] Sample repos:', repos.slice(0, 3).map(r => r.full_name || r.name));
      setRepositories(repos);
      
      if (onTokenSet) {
        onTokenSet(token);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch repositories";
      console.error('[GitHubIntegration] Error fetching repositories:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
    onRepositorySelected(repo);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-2">GitHub Personal Access Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-3 py-2 border border-black outline-none text-sm"
        />
        <p className="text-xs text-gray-600 mt-1">
          {`Create token at github.com/settings/tokens with 'repo' scope`}
        </p>
      </div>

      <button
        onClick={handleFetchRepos}
        disabled={loading || !token.trim()}
        className="w-full px-4 py-2 bg-black text-white disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Loading repositories...
          </>
        ) : (
          "Fetch Repositories"
        )}
      </button>

      {isComplete && selectedRepo && (
        <div className="p-4 border border-black bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">{selectedRepo.name}</h3>
          </div>
          <p className="text-sm text-gray-600">{selectedRepo.description || "No description"}</p>
          <p className="text-xs text-gray-500 mt-1">Branch: {selectedRepo.defaultBranch || selectedRepo.default_branch}</p>
          <button
            onClick={() => setSelectedRepo(null)}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Change Repository
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 border border-black bg-white flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-700">{error}</p>
            <div className="text-xs text-gray-600 mt-2 space-y-1">
              <p className="font-semibold">Troubleshooting:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>{`Verify token is correctly copied (starts with 'ghp_')`}</li>
                <li>Token may be expired - create a new one at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">github.com/settings/tokens</a></li>
                <li>{`Ensure 'repo' scope is selected when creating token`}</li>
                <li>Check that the GitHub account has repositories</li>
                <li>Check browser console (F12) for detailed error logs</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {repositories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Select a repository ({repositories.length} found):</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {repositories.map((repo) => (
              <button
                key={repo.id}
                onClick={() => {
                  const mappedRepo = {
                    id: repo.id,
                    name: repo.name,
                    full_name: repo.full_name,
                    fullName: repo.fullName || repo.full_name,
                    owner: repo.owner,
                    html_url: repo.html_url || repo.url,
                    description: repo.description,
                    private: repo.private || repo.isPrivate,
                    fork: repo.fork || repo.isFork,
                    default_branch: repo.default_branch || repo.defaultBranch,
                    defaultBranch: repo.defaultBranch || repo.default_branch,
                  };
                  handleSelectRepo(mappedRepo);
                }}
                className={`w-full p-3 border text-left transition-colors ${
                  selectedRepo?.id === repo.id
                    ? "border-green-500 bg-green-50"
                    : "border-black hover:bg-gray-50"
                }`}
              >
                <p className="font-semibold text-sm">{repo.name}</p>
                <p className="text-xs text-gray-600">
                  {repo.fullName || repo.full_name}
                  {(repo.private || repo.isPrivate) && <span className="ml-2 text-red-600">🔒 Private</span>}
                  {(repo.fork || repo.isFork) && <span className="ml-2 text-gray-500">⎇ Fork</span>}
                </p>
                <p className="text-xs text-gray-500">{repo.description || "No description"}</p>
                {(repo.stars || repo.stargazers_count) && <p className="text-xs text-yellow-600 mt-1">⭐ {repo.stars || repo.stargazers_count} stars</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
