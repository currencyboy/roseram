'use client';

import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, RefreshCw, ExternalLink, GitBranch, Copy, Check } from 'lucide-react';

export function BranchCreationModal({
  isOpen,
  owner,
  repo,
  progress,
  error,
  onRetry,
  onCancel,
  existingBranches = [],
  onSelectExistingBranch,
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [showExistingBranches, setShowExistingBranches] = useState(false);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Setting Up Working Branch
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Repository Info */}
          <div className="text-sm text-gray-600">
            <p className="font-mono bg-gray-50 px-3 py-2 rounded">
              {owner}/{repo}
            </p>
          </div>

          {/* Progress or Error State */}
          {!error ? (
            <>
              {/* Loading */}
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Creating your working branch...</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {progress || 'Initializing repository for editing'}
                  </p>
                </div>
              </div>

              {/* Hint */}
              <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
                This typically takes 10-30 seconds. If it takes longer, check that your GitHub token has the "repo" scope.
              </div>

              {/* Existing Branches Option */}
              {existingBranches.length > 0 && (
                <button
                  onClick={() => setShowExistingBranches(!showExistingBranches)}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                >
                  {showExistingBranches ? 'Hide' : 'View'} existing branches ({existingBranches.length})
                </button>
              )}

              {/* Existing Branches List */}
              {showExistingBranches && existingBranches.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {existingBranches.map(branch => (
                    <button
                      key={branch.name}
                      onClick={() => onSelectExistingBranch?.(branch)}
                      className="w-full text-left p-3 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-mono font-medium text-green-900">
                            {branch.name}
                          </p>
                          <p className="text-xs text-green-700">
                            Updated {new Date(branch.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-green-600">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Error State */}
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Failed to create branch</p>
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="space-y-2 text-xs bg-red-50 p-3 rounded">
                <p className="font-medium text-red-900 mb-2">Troubleshooting:</p>
                <ul className="space-y-1 text-red-800">
                  <li>✓ Verify your GitHub token has "repo" scope</li>
                  <li>✓ Check that you have write access to {owner}/{repo}</li>
                  <li>✓ Ensure the repository exists and is accessible</li>
                  <li>✓ Try generating a new token at github.com/settings/tokens</li>
                </ul>
              </div>

              {/* Existing Branches Fallback */}
              {existingBranches.length > 0 && (
                <>
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Use existing branch instead:
                    </p>
                    <div className="space-y-2">
                      {existingBranches.map(branch => (
                        <button
                          key={branch.name}
                          onClick={() => onSelectExistingBranch?.(branch)}
                          className="w-full text-left p-3 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-mono font-medium text-green-900">
                                {branch.name}
                              </p>
                              <p className="text-xs text-green-700">
                                Updated {new Date(branch.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-green-600">→</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          {error && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
