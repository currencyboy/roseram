'use client';

import { useEffect, useRef } from 'react';
import { useBranchSync } from '@/lib/branch-sync-context';

/**
 * Component that loads files from the working branch
 * No forking needed - directly accesses the GitHub branch
 */
export function BranchFileLoader({ githubToken, onFilesLoaded, onError }) {
  const { currentBranch, repository } = useBranchSync();
  const loadedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!currentBranch || !repository || !githubToken) {
      console.log('[BranchFileLoader] Missing required data', {
        hasBranch: !!currentBranch,
        hasRepo: !!repository,
        hasToken: !!githubToken,
      });
      return;
    }

    if (loadedRef.current) {
      console.log('[BranchFileLoader] Files already loaded, skipping');
      return;
    }

    loadedRef.current = true;
    retryCountRef.current = 0;
    loadRepositoryFiles();
  }, [currentBranch, repository, githubToken, onFilesLoaded, onError]);

  const loadRepositoryFiles = async () => {
    try {
      if (!currentBranch || !repository) {
        console.warn('[BranchFileLoader] Branch or repository not ready');
        return;
      }

      const repoInfo = `${repository.owner}/${repository.repo}`;
      const branchName = currentBranch.name;
      console.log(`[BranchFileLoader] Loading files from branch: ${branchName} (${repoInfo})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for large repos

      try {
        // Fetch the repository structure from the working branch
        const structureResponse = await fetch('/api/repository', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${githubToken}`,
          },
          body: JSON.stringify({
            action: 'getStructure',
            owner: repository.owner,
            repo: repository.repo,
            branch: branchName,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!structureResponse.ok) {
          const errorText = await structureResponse.text().catch(() => structureResponse.statusText);
          console.error(`[BranchFileLoader] API returned ${structureResponse.status}: ${errorText}`);

          if (structureResponse.status === 401) {
            throw new Error('GitHub token is invalid or expired. Please reconnect GitHub.');
          } else if (structureResponse.status === 404) {
            throw new Error(`Branch ${branchName} not found on ${repoInfo}.`);
          } else {
            throw new Error(`Failed to fetch repository structure: ${structureResponse.statusText}`);
          }
        }

        const structureData = await structureResponse.json();

        if (structureData.error) {
          console.error('[BranchFileLoader] API error response:', structureData);
          throw new Error(structureData.details || structureData.error);
        }

        if (!structureData.files) {
          console.warn(`[BranchFileLoader] No files property in response`);
          onFilesLoaded?.([]);
          return;
        }

        // If files is empty, that's okay - branch might be new
        if (structureData.files.length === 0) {
          console.log(`[BranchFileLoader] Branch is empty (newly created)`);
          onFilesLoaded?.([]);
          return;
        }

        console.log(
          `[BranchFileLoader] Successfully loaded ${structureData.files.length} files from ${branchName} on ${repoInfo}`
        );

        onFilesLoaded?.(structureData.files);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error(`Request timed out after 60s. The repository may be very large or the server is busy. Try again in a moment or try a smaller repository.`);
        }
        throw fetchErr;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error loading files';
      console.error('[BranchFileLoader] Error loading files:', errorMsg);

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`[BranchFileLoader] Retrying (${retryCountRef.current}/${maxRetries})...`);
        setTimeout(() => {
          loadedRef.current = false;
          loadRepositoryFiles();
        }, 2000 * retryCountRef.current);
      } else {
        onError?.(errorMsg);
      }
    }
  };

  return null;
}

export default BranchFileLoader;
