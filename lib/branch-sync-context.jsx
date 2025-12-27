'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const BranchSyncCtx = createContext(null);

/**
 * BranchSyncContext manages the auto-generated working branch across all components
 * This is the single source of truth for:
 * - Current working branch metadata
 * - Repository information
 * - Branch synchronization state
 * - Notifications to all consumers about branch/file changes
 */
export function BranchSyncProvider({ children }) {
  const [currentBranch, setCurrentBranch] = useState(null);
  const [repository, setRepository] = useState(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [branchError, setBranchError] = useState(null);
  const [filesSynced, setFilesSynced] = useState(false);
  const [syncedFiles, setSyncedFiles] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('roseram_branch_sync');
      if (stored) {
        const data = JSON.parse(stored);
        setCurrentBranch(data.branch);
        setRepository(data.repository);
        setFilesSynced(data.filesSynced || false);
        setSyncedFiles(data.syncedFiles || []);
      }
    } catch (err) {
      console.warn('[BranchSyncContext] Failed to load from localStorage:', err);
    }
  }, []);

  // Check if a branch still exists on GitHub
  const validateBranchExists = useCallback(async (owner, repo, branchName, githubToken) => {
    try {
      const response = await fetch('/api/github/get-branch-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          branch: branchName,
          token: githubToken,
        }),
      });

      if (!response.ok) {
        console.log(`[BranchSyncContext] Branch ${branchName} no longer exists`);
        return null;
      }

      const data = await response.json();
      return data.success ? data.branch : null;
    } catch (error) {
      console.warn(`[BranchSyncContext] Failed to validate branch:`, error.message);
      return null;
    }
  }, []);

  // Look for an existing roseram branch for this repository
  const findExistingBranch = useCallback(async (owner, repo, githubToken) => {
    try {
      const response = await fetch('/api/github/list-branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          token: githubToken,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.branches || data.branches.length === 0) {
        console.log(`[BranchSyncContext] No existing roseram branches found for ${owner}/${repo}`);
        return null;
      }

      // Return the most recent branch
      const mostRecent = data.branches[0];
      console.log(`[BranchSyncContext] Found existing roseram branch: ${mostRecent.name}`);
      return mostRecent;
    } catch (error) {
      console.warn(`[BranchSyncContext] Failed to search for existing branches:`, error.message);
      return null;
    }
  }, []);

  // Validate that token has required scopes for branch creation
  const validateTokenScopes = useCallback(async (githubToken) => {
    try {
      const response = await fetch('/api/integrations/validate-token-scopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.details || data.error || 'Failed to validate token');
      }

      if (!data.canCreateBranches) {
        const scopesInfo = data.scopes && data.scopes.length > 0
          ? `Current scopes: ${data.scopes.join(', ')}. `
          : '';
        throw new Error(
          `Your GitHub token does not have permission to create branches. ${scopesInfo}` +
          'Required scope: "repo" (Full control of private repositories). ' +
          'To fix: Generate a new token at https://github.com/settings/tokens with "repo" scope checked.'
        );
      }

      console.log('[BranchSyncContext] Token validation passed. Scopes:', data.scopes.join(', '));
      return true;
    } catch (error) {
      console.error('[BranchSyncContext] Token validation failed:', error.message);
      throw error;
    }
  }, []);

  // Create a new working branch for the selected repository
  const createBranch = useCallback(async (owner, repo, githubToken, baseBranch = 'main') => {
    setIsCreatingBranch(true);
    setBranchError(null);

    try {
      // Validate token has required scopes
      await validateTokenScopes(githubToken);

      // First, check if we have a stored branch for this repo
      let storedBranch = null;
      if (currentBranch && currentBranch.owner === owner && currentBranch.repo === repo) {
        // Validate that the stored branch still exists
        storedBranch = await validateBranchExists(owner, repo, currentBranch.name, githubToken);
        if (storedBranch) {
          console.log('[BranchSyncContext] Reusing existing stored branch:', storedBranch.name);
          const branchInfo = {
            name: storedBranch.name,
            owner,
            repo,
            baseBranch,
            sha: storedBranch.sha,
            url: storedBranch.url,
            token: githubToken,
            createdAt: currentBranch.createdAt,
            resumed: true,
          };

          setCurrentBranch(branchInfo);
          setRepository({ owner, repo, defaultBranch: baseBranch });
          setBranchError(null);

          // Update localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'roseram_branch_sync',
              JSON.stringify({
                branch: branchInfo,
                repository: { owner, repo, defaultBranch: baseBranch },
                filesSynced: false,
                syncedFiles: [],
              })
            );
          }

          return branchInfo;
        }
      }

      // If no valid stored branch, look for other existing roseram branches
      const existingBranch = await findExistingBranch(owner, repo, githubToken);
      if (existingBranch) {
        console.log('[BranchSyncContext] Reusing existing roseram branch:', existingBranch.name);
        const branchInfo = {
          name: existingBranch.name,
          owner,
          repo,
          baseBranch,
          sha: existingBranch.sha,
          url: existingBranch.url,
          token: githubToken,
          createdAt: new Date().toISOString(),
          resumed: true,
        };

        setCurrentBranch(branchInfo);
        setRepository({ owner, repo, defaultBranch: baseBranch });
        setFilesSynced(false);
        setSyncedFiles([]);
        setBranchError(null);

        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'roseram_branch_sync',
            JSON.stringify({
              branch: branchInfo,
              repository: { owner, repo, defaultBranch: baseBranch },
              filesSynced: false,
              syncedFiles: [],
            })
          );
        }

        return branchInfo;
      }

      // No existing branch found, create a new one
      const response = await fetch('/api/github/create-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          baseBranch,
          token: githubToken,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Build a comprehensive error message from the API response
        let errorMessage = data.error || 'Failed to create branch';

        if (data.isPermissionError) {
          errorMessage = `${errorMessage}\n\n${data.fix}\n\nURL: ${data.fixUrl}`;
        } else if (data.isAuthError) {
          errorMessage = `${errorMessage}\n\nPlease generate a new token at https://github.com/settings/tokens`;
        }

        if (data.details) {
          errorMessage = `${errorMessage}\n\nDetails: ${data.details}`;
        }

        throw new Error(errorMessage);
      }

      const branchInfo = {
        name: data.branch,
        owner,
        repo,
        baseBranch,
        sha: data.sha,
        url: data.url,
        token: githubToken,
        createdAt: new Date().toISOString(),
        resumed: false,
      };

      const repositoryInfo = { owner, repo, defaultBranch: baseBranch };

      setCurrentBranch(branchInfo);
      setRepository(repositoryInfo);
      setFilesSynced(false);
      setSyncedFiles([]);
      setBranchError(null);

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'roseram_branch_sync',
          JSON.stringify({
            branch: branchInfo,
            repository: repositoryInfo,
            filesSynced: false,
            syncedFiles: [],
          })
        );
      }

      console.log('[BranchSyncContext] Created new working branch:', branchInfo.name);
      return branchInfo;
    } catch (error) {
      const errorMsg = error.message || 'Failed to create branch';
      setBranchError(errorMsg);
      console.error('[BranchSyncContext] Error:', errorMsg);
      throw error;
    } finally {
      setIsCreatingBranch(false);
    }
  }, [currentBranch, validateBranchExists, findExistingBranch, validateTokenScopes]);

  // Update files synced to this branch (called by FileExplorer when it loads files)
  const updateSyncedFiles = useCallback((files) => {
    setSyncedFiles(files);
    setFilesSynced(true);

    if (typeof window !== 'undefined' && currentBranch && repository) {
      localStorage.setItem(
        'roseram_branch_sync',
        JSON.stringify({
          branch: currentBranch,
          repository,
          filesSynced: true,
          syncedFiles: files,
        })
      );
    }

    console.log('[BranchSyncContext] Updated synced files:', files.length);
  }, [currentBranch, repository]);

  // Clear the working branch (e.g., when switching repositories)
  const clearBranch = useCallback(() => {
    setCurrentBranch(null);
    setRepository(null);
    setBranchError(null);
    setFilesSynced(false);
    setSyncedFiles([]);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('roseram_branch_sync');
    }

    console.log('[BranchSyncContext] Cleared branch and repository');
  }, []);

  // Switch to a different branch
  const switchBranch = useCallback(async (owner, repo, newBranchName, githubToken) => {
    if (!githubToken) {
      throw new Error('GitHub token required to switch branches');
    }

    setFilesSynced(false);
    setSyncedFiles([]);

    const branchInfo = {
      name: newBranchName,
      owner,
      repo,
      baseBranch: repository?.defaultBranch || 'main',
      token: githubToken,
      createdAt: currentBranch?.createdAt || new Date().toISOString(),
    };

    setCurrentBranch(branchInfo);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'roseram_branch_sync',
        JSON.stringify({
          branch: branchInfo,
          repository,
          filesSynced: false,
          syncedFiles: [],
        })
      );
    }

    console.log('[BranchSyncContext] Switched to branch:', newBranchName);
    return branchInfo;
  }, [repository, currentBranch]);

  const value = {
    // Current state
    currentBranch,
    repository,
    isCreatingBranch,
    branchError,
    filesSynced,
    syncedFiles,

    // Actions
    createBranch,
    updateSyncedFiles,
    clearBranch,
    switchBranch,

    // Computed
    hasActiveBranch: !!currentBranch && !!repository,
    branchUrl: currentBranch ? currentBranch.url : null,
  };

  return (
    <BranchSyncCtx.Provider value={value}>
      {children}
    </BranchSyncCtx.Provider>
  );
}

export function useBranchSync() {
  const context = useContext(BranchSyncCtx);
  if (!context) {
    throw new Error('useBranchSync must be used within BranchSyncProvider');
  }
  return context;
}
