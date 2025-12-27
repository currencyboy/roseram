import { useState, useCallback, useEffect } from 'react';

const FORK_STORAGE_KEY = 'roseram_forked_repo';

export function useForkManagement(token) {
  const [forkedRepo, setForkedRepo] = useState(null);
  const [forking, setForking] = useState(false);
  const [pushingToMain, setPushingToMain] = useState(false);
  const [forkError, setForkError] = useState(null);

  // Load fork metadata from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(FORK_STORAGE_KEY);
      if (stored) {
        setForkedRepo(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Failed to load fork metadata:', err);
    }
  }, []);

  // Fork a repository
  const forkRepository = useCallback(
    async (owner, repo) => {
      if (!token) {
        setForkError('GitHub token required');
        return null;
      }

      setForking(true);
      setForkError(null);

      try {
        const response = await fetch('/api/github/fork', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ token, owner, repo }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Fork failed (${response.status})`
          );
        }

        const data = await response.json();

        if (data.success) {
          const forkData = {
            id: data.fork.id,
            name: data.fork.name,
            owner: data.fork.owner,
            url: data.fork.url,
            cloneUrl: data.fork.cloneUrl,
            defaultBranch: data.fork.defaultBranch,
            source: data.fork.source,
            createdAt: new Date().toISOString(),
          };

          setForkedRepo(forkData);
          localStorage.setItem(FORK_STORAGE_KEY, JSON.stringify(forkData));
          
          return forkData;
        }

        throw new Error(data.error || 'Fork operation failed');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Fork failed';
        console.error('Fork error:', errorMsg);
        setForkError(errorMsg);
        return null;
      } finally {
        setForking(false);
      }
    },
    [token]
  );

  // Push changes directly to main branch of forked repo
  const pushToMain = useCallback(
    async (files, message = 'Updated with ROSERAM') => {
      if (!token || !forkedRepo) {
        setForkError('Fork or token not configured');
        return null;
      }

      setPushingToMain(true);
      setForkError(null);

      try {
        const filesToPush = Array.isArray(files)
          ? files
          : Object.entries(files).map(([path, content]) => ({ path, content }));

        if (filesToPush.length === 0) {
          throw new Error('No files to push');
        }

        const response = await fetch('/api/github/push-to-main', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            token,
            owner: forkedRepo.owner,
            repo: forkedRepo.name,
            files: filesToPush,
            message,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Push failed (${response.status})`
          );
        }

        const data = await response.json();

        if (data.success) {
          return {
            success: true,
            commit: data.commit,
          };
        }

        throw new Error(data.error || 'Push operation failed');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Push failed';
        console.error('Push to main error:', errorMsg);
        setForkError(errorMsg);
        return null;
      } finally {
        setPushingToMain(false);
      }
    },
    [token, forkedRepo]
  );

  // Clear fork data
  const clearFork = useCallback(() => {
    setForkedRepo(null);
    localStorage.removeItem(FORK_STORAGE_KEY);
    setForkError(null);
  }, []);

  return {
    forkedRepo,
    forking,
    pushingToMain,
    forkError,
    forkRepository,
    pushToMain,
    clearFork,
  };
}

export default useForkManagement;
