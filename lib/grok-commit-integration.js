/**
 * Integration between Grok code generation and GitHub auto-commit
 * Handles:
 * 1. Processing generated code from Grok
 * 2. Creating diffs for user review
 * 3. Auto-committing changes to the forked branch
 */

/**
 * Prepare changes for auto-commit
 * Takes generated code and current file cache, creates a diff
 */
export function prepareDiffForCommit(generatedFiles, currentFileCache = {}) {
  const diffs = [];

  for (const file of generatedFiles) {
    const { path, content } = file;
    const originalContent = currentFileCache[path] || '';
    
    diffs.push({
      path,
      original: originalContent,
      modified: content,
      isNew: !currentFileCache[path],
      hasChanges: originalContent !== content,
    });
  }

  return diffs;
}

/**
 * Filter diffs to only include actual changes
 */
export function filterActualChanges(diffs) {
  return diffs.filter(diff => diff.hasChanges || diff.isNew);
}

/**
 * Create a commit message from Grok prompt and generated files
 */
export function generateCommitMessage(prompt, generatedFiles) {
  const fileCount = generatedFiles.length;
  const fileNames = generatedFiles
    .slice(0, 3)
    .map(f => f.path.split('/').pop())
    .join(', ');
  
  const additionalText = fileCount > 3 ? ` and ${fileCount - 3} more` : '';
  
  // Truncate prompt to 50 chars
  const promptSummary = prompt.substring(0, 50).trim();
  const ellipsis = prompt.length > 50 ? '...' : '';
  
  return `[Grok] ${promptSummary}${ellipsis}\n\nModified: ${fileNames}${additionalText}\nFiles: ${fileCount}`;
}

/**
 * Auto-commit generated code to GitHub branch
 * @param {Object} options
 * @param {Array} options.files - Generated files from Grok
 * @param {string} options.owner - Repository owner
 * @param {string} options.repo - Repository name
 * @param {string} options.branch - Target branch (usually the forked/working branch)
 * @param {string} options.token - GitHub token
 * @param {string} options.message - Commit message (auto-generated if not provided)
 * @param {string} options.prompt - Original Grok prompt (for commit message context)
 * @returns {Promise<{success: boolean, commitSha?: string, error?: string}>}
 */
export async function autoCommitGeneratedCode({
  files,
  owner,
  repo,
  branch,
  token,
  message,
  prompt,
}) {
  if (!owner || !repo || !branch || !token) {
    throw new Error('Missing required parameters for auto-commit');
  }

  if (!files || files.length === 0) {
    throw new Error('No files to commit');
  }

  try {
    // Use provided message or generate one from prompt
    const commitMessage = message || generateCommitMessage(prompt || 'Update', files);

    // Call the GitHub API to commit
    const response = await fetch('/api/github/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        owner,
        repo,
        branch,
        files: files.map(f => ({
          path: f.path,
          content: f.content,
        })),
        message: commitMessage,
        token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Commit failed (${response.status})`);
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        commitSha: result.commit?.sha,
        message: `Auto-committed ${files.length} file(s) to ${branch}`,
      };
    } else {
      throw new Error(result.error || 'Commit operation failed');
    }
  } catch (error) {
    console.error('[GrokCommitIntegration] Auto-commit failed:', error.message);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Auto-commit failed',
    };
  }
}

/**
 * Create a diff summary for display
 */
export function createDiffSummary(diffs) {
  const changed = diffs.filter(d => d.hasChanges);
  const created = diffs.filter(d => d.isNew);

  return {
    total: diffs.length,
    changed: changed.length,
    created: created.length,
    diffs,
    summary: `${created.length} new file(s), ${changed.length} modified file(s)`,
  };
}

/**
 * Format a diff for display in the UI
 */
export function formatDiffForDisplay(diff) {
  const lineAdded = (diff.modified || '').split('\n').length;
  const lineRemoved = (diff.original || '').split('\n').length;

  return {
    ...diff,
    stats: {
      added: Math.max(0, lineAdded - lineRemoved),
      removed: Math.max(0, lineRemoved - lineAdded),
      total: Math.max(lineAdded, lineRemoved),
    },
    type: diff.isNew ? 'new' : 'modified',
  };
}
