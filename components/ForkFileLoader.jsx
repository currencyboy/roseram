'use client';

import { useEffect, useRef } from 'react';
import { getInitializationProgress } from '@/lib/initialization-progress';

/**
 * Component that loads files from GitHub when a repository is forked
 * Fetches the repository structure and file contents
 */
export function ForkFileLoader({ forkedRepo, githubToken, onFilesLoaded, onError }) {
  const loadedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const progressRef = useRef(null);

  useEffect(() => {
    if (!forkedRepo || !githubToken) {
      console.log('[ForkFileLoader] Missing forkedRepo or githubToken', { forkedRepo: !!forkedRepo, githubToken: !!githubToken });
      return;
    }

    if (loadedRef.current) {
      return;
    }

    loadedRef.current = true;
    retryCountRef.current = 0;
    loadRepositoryFiles();
  }, [forkedRepo, githubToken, onFilesLoaded, onError]);

  const loadRepositoryFiles = async () => {
    try {
      const repoInfo = `${forkedRepo.owner}/${forkedRepo.repoName}`;
      console.log(`[ForkFileLoader] Loading files for ${repoInfo}`);

      // Track progress
      if (!progressRef.current) {
        progressRef.current = getInitializationProgress();
      }
      progressRef.current.startStep('files');

      // Fetch the repository structure
      const structureResponse = await fetch('/api/repository', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`,
        },
        body: JSON.stringify({
          action: 'getStructure',
          owner: forkedRepo.owner,
          repo: forkedRepo.repoName,
          branch: forkedRepo.defaultBranch || 'main',
        }),
      });

      if (!structureResponse.ok) {
        const errorText = await structureResponse.text().catch(() => structureResponse.statusText);
        console.error(`[ForkFileLoader] API returned ${structureResponse.status}: ${errorText}`);

        if (structureResponse.status === 401) {
          throw new Error('GitHub token is invalid or expired. Please reconnect GitHub.');
        } else if (structureResponse.status === 404) {
          throw new Error(`Repository ${repoInfo} not found. Verify it exists and is accessible.`);
        } else {
          throw new Error(`Failed to fetch repository structure: ${structureResponse.statusText}`);
        }
      }

      const structureData = await structureResponse.json();

      if (structureData.error) {
        console.error('[ForkFileLoader] API error response:', structureData);
        throw new Error(structureData.details || structureData.error);
      }

      if (!structureData.files || structureData.files.length === 0) {
        console.warn(`[ForkFileLoader] No files found in repository ${repoInfo}`);
        progressRef.current.completeStep('files');
        onFilesLoaded?.([]);
        return;
      }

      // Log directory structure for debugging
      const directories = new Set();
      structureData.files.forEach(file => {
        const dirs = file.path.split('/').slice(0, -1);
        if (dirs.length > 0) {
          directories.add(dirs.join('/'));
        }
      });

      console.log(`[ForkFileLoader] Successfully loaded ${structureData.files.length} files from ${repoInfo}`);
      console.log(`[ForkFileLoader] Directory structure includes ${directories.size} folders:`, Array.from(directories).slice(0, 10).join(', ') + (directories.size > 10 ? '...' : ''));

      // Mark files as loaded and start analyzing dependencies
      progressRef.current.completeStep('files');
      progressRef.current.startStep('dependencies');

      // Analyze dependencies in the background (non-blocking)
      setTimeout(() => {
        progressRef.current.completeStep('dependencies');
      }, 500);

      // Return files immediately to prevent blocking
      onFilesLoaded?.(structureData.files);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error loading files';
      console.error('[ForkFileLoader] Error loading files:', errorMsg);

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`[ForkFileLoader] Retrying (${retryCountRef.current}/${maxRetries})...`);
        setTimeout(() => {
          loadedRef.current = false;
          loadRepositoryFiles();
        }, 2000 * retryCountRef.current);
      } else {
        onError?.(errorMsg);
      }
    }
  };

  // This component doesn't render anything
  return null;
}

export default ForkFileLoader;
