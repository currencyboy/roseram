/**
 * GitHub File Poller - Monitors GitHub repository for file changes
 * Detects modifications, deletions, and new files by comparing file hashes
 */

class GitHubFilePoller {
  constructor(githubToken) {
    this.githubToken = githubToken;
    this.pollingInterval = null;
    this.fileHashes = new Map(); // path -> { sha, content_hash }
    this.listeners = [];
  }

  /**
   * Calculate a simple hash of file content
   */
  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Fetch file tree from GitHub API
   */
  async fetchFileTree(owner, repo, branch) {
    try {
      const response = await fetch(`/api/repository`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubToken}`,
        },
        body: JSON.stringify({
          action: 'getStructure',
          owner,
          repo,
          branch,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('[GitHubFilePoller] Error fetching file tree:', error);
      return null;
    }
  }

  /**
   * Fetch file content from GitHub
   */
  async fetchFileContent(owner, repo, path, branch) {
    try {
      const response = await fetch(`/api/repository`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubToken}`,
        },
        body: JSON.stringify({
          action: 'getFile',
          owner,
          repo,
          path,
          branch,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.file?.content || null;
    } catch (error) {
      console.error(`[GitHubFilePoller] Error fetching ${path}:`, error);
      return null;
    }
  }

  /**
   * Check for changes in repository
   */
  async checkForChanges(owner, repo, branch) {
    const currentFiles = await this.fetchFileTree(owner, repo, branch);
    
    if (!currentFiles) {
      return { changes: [], status: 'error' };
    }

    const changes = [];
    const currentPaths = new Set();

    // Check for modified and new files
    for (const file of currentFiles) {
      if (file.type === 'file') {
        currentPaths.add(file.path);

        const previousHash = this.fileHashes.get(file.path);
        
        // If file is new or SHA changed, check content
        if (!previousHash || previousHash.sha !== file.sha) {
          const content = await this.fetchFileContent(owner, repo, file.path, branch);
          
          if (content !== null) {
            const contentHash = this.hashContent(content);
            
            // Only track if hash truly changed
            if (!previousHash || previousHash.contentHash !== contentHash) {
              changes.push({
                type: previousHash ? 'modified' : 'added',
                path: file.path,
                sha: file.sha,
              });

              this.fileHashes.set(file.path, {
                sha: file.sha,
                contentHash,
              });
            }
          }
        }
      }
    }

    // Check for deleted files
    for (const [path] of this.fileHashes) {
      if (!currentPaths.has(path)) {
        changes.push({
          type: 'deleted',
          path,
        });
        this.fileHashes.delete(path);
      }
    }

    return {
      changes,
      status: 'success',
      filesChecked: currentFiles.length,
    };
  }

  /**
   * Register a callback for changes
   */
  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners(changeData) {
    this.listeners.forEach(callback => {
      try {
        callback(changeData);
      } catch (error) {
        console.error('[GitHubFilePoller] Error in listener callback:', error);
      }
    });
  }

  /**
   * Start polling for changes
   */
  startPolling(owner, repo, branch, interval = 10000) {
    if (this.pollingInterval) {
      console.warn('[GitHubFilePoller] Polling already active');
      return;
    }

    console.log(`[GitHubFilePoller] Starting polling for ${owner}/${repo}:${branch} every ${interval}ms`);

    this.pollingInterval = setInterval(async () => {
      const changeData = await this.checkForChanges(owner, repo, branch);
      
      if (changeData.changes.length > 0) {
        console.log('[GitHubFilePoller] Detected changes:', changeData.changes);
        this.notifyListeners(changeData);
      }
    }, interval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[GitHubFilePoller] Polling stopped');
    }
  }

  /**
   * Initialize file hashes from current state
   */
  initializeHashes(files) {
    this.fileHashes.clear();
    
    for (const [path, content] of Object.entries(files)) {
      this.fileHashes.set(path, {
        sha: null,
        contentHash: this.hashContent(content),
      });
    }
  }
}

export default GitHubFilePoller;
