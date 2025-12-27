/**
 * Branch management utilities
 * Handles branch detection, listing, and validation
 */

/**
 * List all roseram branches for a repository
 */
export async function listRoseramBranches(owner, repo, githubToken) {
  try {
    const response = await fetch('/api/github/list-branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, token: githubToken }),
    });

    const data = await response.json();
    if (!data.success) {
      console.error('[BranchUtils] Failed to list branches:', data.error);
      return [];
    }

    return data.branches || [];
  } catch (error) {
    console.error('[BranchUtils] Error listing branches:', error);
    return [];
  }
}

/**
 * Get info about a specific branch
 */
export async function getBranchInfo(owner, repo, branchName, githubToken) {
  try {
    const response = await fetch('/api/github/get-branch-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, branch: branchName, token: githubToken }),
    });

    const data = await response.json();
    if (!data.success) {
      console.error('[BranchUtils] Failed to get branch info:', data.error);
      return null;
    }

    return data.branch;
  } catch (error) {
    console.error('[BranchUtils] Error getting branch info:', error);
    return null;
  }
}

/**
 * Check if a specific branch exists
 */
export async function branchExists(owner, repo, branchName, githubToken) {
  const branchInfo = await getBranchInfo(owner, repo, branchName, githubToken);
  return !!branchInfo;
}

/**
 * Extract timestamp from roseram branch name
 * Branch format: roseram-edit-{timestamp}-{random}
 */
export function extractTimestampFromBranchName(branchName) {
  const parts = branchName.split('-');
  if (parts.length >= 3 && parts[0] === 'roseram' && parts[1] === 'edit') {
    return parseInt(parts[2]) || null;
  }
  return null;
}

/**
 * Get the age of a branch in hours
 */
export function getBranchAgeHours(branchName) {
  const timestamp = extractTimestampFromBranchName(branchName);
  if (!timestamp) return null;
  
  const ageMs = Date.now() - timestamp;
  return Math.floor(ageMs / (1000 * 60 * 60));
}

/**
 * Check if a branch is "old" (more than 7 days)
 */
export function isBranchOld(branchName, maxAgeHours = 7 * 24) {
  const ageHours = getBranchAgeHours(branchName);
  if (ageHours === null) return false;
  return ageHours > maxAgeHours;
}

/**
 * Sort branches by creation date (most recent first)
 */
export function sortBranchesByDate(branches) {
  return [...branches].sort((a, b) => {
    const aTimestamp = extractTimestampFromBranchName(a.name) || 0;
    const bTimestamp = extractTimestampFromBranchName(b.name) || 0;
    return bTimestamp - aTimestamp;
  });
}

/**
 * Get a human-readable description of a branch
 */
export function describeBranch(branch) {
  const ageHours = getBranchAgeHours(branch.name);
  
  if (ageHours === null) {
    return branch.name;
  }
  
  if (ageHours < 1) {
    return `${branch.name} (just created)`;
  }
  
  if (ageHours < 24) {
    return `${branch.name} (${ageHours}h old)`;
  }
  
  const ageDays = Math.floor(ageHours / 24);
  return `${branch.name} (${ageDays}d old)`;
}
