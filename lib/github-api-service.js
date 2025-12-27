/**
 * Unified GitHub API service
 * Centralizes all GitHub operations for:
 * - Creating branches
 * - Reading/writing files
 * - Committing changes
 * - Pushing to branches
 * - Repository operations
 */

export const GitHubAPIService = {
  /**
   * Create an auto-generated working branch
   */
  async createBranch(owner, repo, githubToken, baseBranch = 'main') {
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
      throw new Error(data.error || 'Failed to create branch');
    }

    return {
      name: data.branch,
      sha: data.sha,
      ref: data.ref,
      url: data.url,
    };
  },

  /**
   * Get repository structure (files and folders)
   */
  async getRepositoryStructure(owner, repo, githubToken, branch = 'main') {
    const response = await fetch('/api/repository', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubToken}`,
      },
      body: JSON.stringify({
        action: 'getStructure',
        owner,
        repo,
        branch,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch repository structure');
    }

    return data.files || [];
  },

  /**
   * Get file content
   */
  async getFileContent(owner, repo, githubToken, filePath, branch = 'main') {
    const response = await fetch('/api/repository', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubToken}`,
      },
      body: JSON.stringify({
        action: 'getFile',
        owner,
        repo,
        branch,
        path: filePath,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || `Failed to fetch file: ${filePath}`);
    }

    return data.content || '';
  },

  /**
   * Commit changes to a branch
   */
  async commitChanges(owner, repo, githubToken, branch, files, message) {
    const response = await fetch('/api/repository/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubToken}`,
      },
      body: JSON.stringify({
        owner,
        repo,
        token: githubToken,
        branch,
        message,
        files: files.map(f => ({
          path: f.path,
          content: f.content,
        })),
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to commit changes');
    }

    return {
      sha: data.commit?.sha,
      message: data.commit?.message,
      author: data.commit?.author,
      url: data.commit?.html_url,
    };
  },

  /**
   * Push changes to GitHub (via fork or branch)
   */
  async pushChanges(owner, repo, githubToken, files, message) {
    const response = await fetch('/api/github/push-to-main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubToken}`,
      },
      body: JSON.stringify({
        token: githubToken,
        owner,
        repo,
        files: Array.isArray(files)
          ? files
          : Object.entries(files).map(([path, content]) => ({ path, content })),
        message,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to push changes');
    }

    return {
      sha: data.commit?.sha,
      message: data.commit?.message,
      url: data.commit?.html_url,
    };
  },

  /**
   * Get all branches in a repository
   */
  async getBranches(owner, repo, githubToken) {
    const response = await fetch('/api/repository', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubToken}`,
      },
      body: JSON.stringify({
        action: 'getBranches',
        owner,
        repo,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch branches');
    }

    return data.branches || [];
  },

  /**
   * Get repository details
   */
  async getRepositoryDetails(owner, repo, githubToken) {
    const response = await fetch('/api/integrations/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-repo-details',
        token: githubToken,
        owner,
        repo,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch repository details');
    }

    return data.repository || {};
  },

  /**
   * Validate GitHub token
   */
  async validateToken(githubToken) {
    const response = await fetch('/api/integrations/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'validate-token',
        token: githubToken,
      }),
    });

    const data = await response.json();
    return {
      valid: data.valid || false,
      user: data.user,
      error: data.error,
    };
  },

  /**
   * List user's repositories
   */
  async listRepositories(githubToken) {
    const response = await fetch('/api/integrations/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-repos',
        token: githubToken,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch repositories');
    }

    return data.repositories || [];
  },

  /**
   * List all branches in a repository (including regular branches, not just roseram)
   */
  async listAllBranches(owner, repo, githubToken) {
    const response = await fetch('/api/github/list-all-branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner,
        repo,
        token: githubToken,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch branches');
    }

    return {
      branches: data.branches || [],
      roseramCount: data.roseramCount || 0,
      totalCount: data.totalCount || 0,
    };
  },
};

export default GitHubAPIService;
