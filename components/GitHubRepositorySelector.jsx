"use client";

import { useState, useEffect } from "react";
import { ChevronDown, AlertCircle, Loader, GitBranch, Code } from "lucide-react";

export function GitHubRepositorySelector({ githubToken, onRepositorySelect, onForkComplete, onError }) {
  const [repositories, setRepositories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (githubToken) {
      // Reset state and fetch when token changes
      setRepositories([]);
      setSelectedRepo(null);
      setError(null);
      fetchRepositories();
    }
  }, [githubToken]);

  const fetchRepositories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get-repos",
          token: githubToken,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("GitHub token is invalid or expired");
        }
        throw new Error(`Failed to fetch repositories (${response.status})`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch repositories");
      }

      const repos = data.repositories || [];
      console.log(`[GitHubRepositorySelector] Received ${repos.length} repositories:`, repos.map(r => r.fullName || r.name));
      setRepositories(repos);

      if (repos.length === 0) {
        setError("No repositories found. Create a repository on GitHub to continue.");
      }
    } catch (err) {
      const errorMsg = err.message || "Failed to fetch repositories";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle StackBlitz fork errors

  const handleSelectRepository = (repo) => {
    setSelectedRepo(repo);
    setIsOpen(false);
    onRepositorySelect?.(repo);
  };


  const filteredRepos = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && repositories.length === 0) {
    return (
      <div className="bg-white p-3 xs:p-3 sm:p-4 md:p-5 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3">
          <Loader className="w-4 h-4 animate-spin text-blue-600" />
          <p className="text-xs sm:text-sm text-gray-700">Fetching your GitHub repositories...</p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 xs:p-3 sm:p-4 md:p-5">
        <div className="flex gap-2 xs:gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-red-900">Repository fetch failed</p>
            <p className="text-xs text-red-800 mt-1">{error}</p>
            <button
              onClick={fetchRepositories}
              disabled={isLoading}
              className="mt-2 px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 xs:space-y-3 sm:space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 xs:p-3 sm:p-4 flex gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-blue-800">
          <strong>Important:</strong> Your GitHub repository must be <strong>public</strong> for StackBlitz to embed and preview it. Make sure to set your repository visibility to public before proceeding.
        </p>
      </div>

      <div>
        <label className="block text-xs xs:text-xs sm:text-sm font-medium text-gray-900 mb-2">
          Select GitHub Repository
        </label>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 xs:px-3 sm:px-4 py-2 xs:py-2 sm:py-2.5 text-left bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between text-xs sm:text-sm"
          >
            <span className="flex items-center gap-2">
              {selectedRepo ? (
                <>
                  <GitBranch className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-gray-900">{selectedRepo.name}</span>
                </>
              ) : (
                <span className="text-gray-500">Choose a repository...</span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-[300px] overflow-hidden flex flex-col">
              <div className="p-2 xs:p-2.5 sm:p-3 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="overflow-y-auto flex-1">
                {filteredRepos.length > 0 ? (
                  filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="border-b border-gray-100 last:border-b-0 px-3 xs:px-3 sm:px-4 py-2 xs:py-2 sm:py-2.5 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{repo.name}</p>
                              <p className="text-xs text-gray-600 truncate">{repo.full_name || `${repo.owner?.login}/${repo.name}`}</p>
                            </div>
                          </div>
                          {repo.description && (
                            <p className="text-xs text-gray-600 line-clamp-2 mt-1">{repo.description}</p>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleForkInStackBlitz(repo);
                          }}
                          disabled={forking || isStackBlitzForking}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded whitespace-nowrap flex-shrink-0"
                        >
                          {forking || isStackBlitzForking ? (
                            <>
                              <Loader className="w-3 h-3 animate-spin" />
                              Forking...
                            </>
                          ) : (
                            <>
                              <Code className="w-3 h-3" />
                              Fork
                            </>
                          )}
                        </button>
                      </div>

                      {(repo.isPrivate || repo.private) && (
                        <div className="mt-2">
                          <span className="inline-block px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            🔒 Private - Not compatible
                          </span>
                          <p className="text-xs text-red-600 mt-1">Make this repository public on GitHub to use with StackBlitz</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-3 xs:px-3 sm:px-4 py-4 text-xs sm:text-sm text-gray-500 text-center">
                    No repositories found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedRepo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 xs:p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-blue-900">
            <span className="font-semibold">Selected:</span> {selectedRepo.full_name}
          </p>
          {selectedRepo.description && (
            <p className="text-xs text-blue-800 mt-1">{selectedRepo.description}</p>
          )}
        </div>
      )}

      {repositories.length > 0 && !selectedRepo && (
        <p className="text-xs text-gray-500">
          Found {repositories.length} repository{repositories.length !== 1 ? "ies" : ""} • Select one to continue
        </p>
      )}
    </div>
  );
}
