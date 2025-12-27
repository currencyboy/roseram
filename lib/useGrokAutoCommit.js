'use client';

import { useState, useCallback } from 'react';
import {
  autoCommitGeneratedCode,
  prepareDiffForCommit,
  createDiffSummary,
  filterActualChanges,
} from './grok-commit-integration';

/**
 * Hook to integrate Grok code generation with auto-commit to GitHub
 * 
 * Usage in CodeBuilder:
 * const { handleGrokGenerated, showDiffModal, commitState } = useGrokAutoCommit({
 *   owner: repository?.owner,
 *   repo: repository?.name,
 *   branch: currentBranch?.name,
 *   token: github.token,
 *   fileCache: fileCache,
 *   onCommitSuccess: (result) => { 
 *     // Refresh preview, update files, etc.
 *   }
 * });
 */
export function useGrokAutoCommit({
  owner,
  repo,
  branch,
  token,
  fileCache = {},
  onCommitSuccess,
  onCommitError,
} = {}) {
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [pendingDiff, setPendingDiff] = useState(null);
  const [commitState, setCommitState] = useState({
    loading: false,
    error: null,
    success: false,
    commitSha: null,
  });
  const [lastCommitMessage, setLastCommitMessage] = useState('');

  /**
   * Process generated code from Grok and show diff
   * Should be called from CodeGeneratorChat when code is generated
   */
  const handleGrokGenerated = useCallback(
    async (generatedFiles, prompt) => {
      try {
        setCommitState({ loading: false, error: null, success: false, commitSha: null });

        // Prepare diffs
        const diffs = prepareDiffForCommit(generatedFiles, fileCache);
        const actualChanges = filterActualChanges(diffs);

        if (actualChanges.length === 0) {
          setCommitState({
            loading: false,
            error: 'No changes detected in generated code',
            success: false,
            commitSha: null,
          });
          return;
        }

        // Show diff modal
        const diffSummary = createDiffSummary(actualChanges);
        setPendingDiff({
          files: generatedFiles,
          diffs: actualChanges,
          summary: diffSummary,
          prompt,
        });
        setShowDiffModal(true);
      } catch (error) {
        setCommitState({
          loading: false,
          error: error.message || 'Failed to prepare diff',
          success: false,
          commitSha: null,
        });
      }
    },
    [fileCache]
  );

  /**
   * Approve and commit the generated code
   */
  const approveAndCommit = useCallback(
    async (customMessage) => {
      if (!pendingDiff || !owner || !repo || !branch || !token) {
        setCommitState({
          loading: false,
          error: 'Missing repository or authentication information',
          success: false,
          commitSha: null,
        });
        return;
      }

      setCommitState({ loading: true, error: null, success: false, commitSha: null });

      try {
        const result = await autoCommitGeneratedCode({
          files: pendingDiff.files,
          owner,
          repo,
          branch,
          token,
          message: customMessage,
          prompt: pendingDiff.prompt,
        });

        if (result.success) {
          setCommitState({
            loading: false,
            error: null,
            success: true,
            commitSha: result.commitSha,
          });
          setLastCommitMessage(result.message);
          setShowDiffModal(false);
          setPendingDiff(null);

          onCommitSuccess?.(result);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Commit failed';
        setCommitState({
          loading: false,
          error: errorMsg,
          success: false,
          commitSha: null,
        });
        onCommitError?.(errorMsg);
      }
    },
    [owner, repo, branch, token, pendingDiff, onCommitSuccess, onCommitError]
  );

  /**
   * Reject and cancel the diff preview
   */
  const rejectAndCancel = useCallback(() => {
    setShowDiffModal(false);
    setPendingDiff(null);
    setCommitState({ loading: false, error: null, success: false, commitSha: null });
  }, []);

  return {
    handleGrokGenerated,
    approveAndCommit,
    rejectAndCancel,
    showDiffModal,
    pendingDiff,
    commitState,
    lastCommitMessage,
    setShowDiffModal,
  };
}
