# GitHub Auto-Sync Feature Guide

## Overview

The GitHub Auto-Sync feature enables the file explorer to automatically detect and sync changes made to your GitHub repository in real-time. This allows multiple users or external tools to modify the repository while you're working in the IDE, and those changes will be automatically reflected in your file explorer.

## Key Features

### 1. **Automatic File Polling**
- Polls GitHub every 10 seconds for file changes
- Detects modified, added, and deleted files
- Non-blocking polling that doesn't interfere with editing

### 2. **Smart Change Detection**
- Uses file SHA hashes to detect modifications
- Implements content hashing to avoid false positives
- Efficiently tracks file states without downloading entire repositories

### 3. **Visual Indicators**
- **Green dot** on files: External changes detected
- **Yellow dot** on files: Local modifications
- **Blue notification banner**: Shows sync summary and affected files
- **Last sync timestamp**: Displays when the last sync occurred

### 4. **Auto-Sync Toggle**
- Click the bell icon in the header to enable/disable auto-sync
- When disabled, you can manually check for changes with the refresh button
- Auto-sync status is shown in the bell icon color

### 5. **Manual Sync**
- Click the refresh icon to manually check for changes at any time
- Useful when auto-sync is disabled or when you want immediate sync

## Architecture

### Components

#### `lib/github-file-poller.js`
- Core polling service that monitors GitHub for changes
- Manages file hash tracking and change detection
- Handles listener registration and notifications

**Key Methods:**
- `startPolling(owner, repo, branch, interval)` - Starts monitoring
- `stopPolling()` - Stops monitoring
- `checkForChanges(owner, repo, branch)` - Manual check for changes
- `onChange(callback)` - Register change listener
- `initializeHashes(files)` - Initialize file state tracking

#### `components/RepoExplorer.jsx`
- Enhanced with file polling integration
- Auto-sync state management
- Visual indicators for external changes
- Notification system for sync events

### State Management

```javascript
const [filePoller, setFilePoller] = useState(null);
const [isPolling, setIsPolling] = useState(false);
const [lastSyncTime, setLastSyncTime] = useState(null);
const [pendingChanges, setPendingChanges] = useState([]);
const [showSyncNotification, setShowSyncNotification] = useState(false);
const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
```

## Usage

### Enable/Disable Auto-Sync

Click the bell icon in the header to toggle auto-sync:
- **Blue bell**: Auto-sync is enabled
- **Gray bell**: Auto-sync is disabled

### Check for Changes Manually

Click the refresh icon next to the bell to manually check for changes:
- If changes are found, they'll be automatically synced
- A notification will show which files changed
- The notification auto-dismisses after 5 seconds

### Monitor Synced Changes

1. **Visual Indicators**: Look for green dots on files that have been externally modified
2. **Notification Banner**: Shows the summary of changes and affected files
3. **Last Sync Time**: Check the timestamp to see when the last sync occurred
4. **Selected File**: If you have a file open that was externally modified, it will be automatically updated

## Sync Behavior

### When a File is Modified Externally

1. Poller detects the change during the next polling cycle (within 10 seconds)
2. File content is fetched from GitHub
3. **If auto-sync is enabled:**
   - File cache is updated
   - If the file is currently open, it's updated in the editor
   - File tree is refreshed to show new files
   - Notification banner appears
4. **If auto-sync is disabled:**
   - Change is detected but not applied
   - Notification shows pending changes
   - User can manually apply by clicking refresh

### When a File is Added Externally

- File tree is refreshed
- New file appears in the explorer
- File can be opened and edited

### When a File is Deleted Externally

- File is removed from cache
- If open, editor is cleared
- File tree is updated

## Performance Considerations

### Polling Interval
- Default: 10 seconds
- Adjustable in the `startPolling()` call
- Shorter intervals = more responsive, higher API usage
- Longer intervals = less responsive, lower API usage

### API Rate Limiting
- Each poll makes one API call to check file structure
- Additional calls for modified/added files
- GitHub API limit: 60 requests/hour for unauthenticated, 5000 for authenticated

### Optimization Strategies

1. **Disable Auto-Sync for Large Repositories**
   - Click bell icon to disable
   - Use manual sync for big codebases

2. **Adjust Polling Interval**
   - For development: Keep default 10s
   - For production: Consider longer intervals

3. **Use Manual Sync**
   - Disable auto-sync
   - Check manually when needed

## Troubleshooting

### Polling Not Working

1. Check if auto-sync is enabled (bell icon should be blue)
2. Verify GitHub token is valid
3. Ensure repository is accessible
4. Check browser console for errors

### Changes Not Syncing

1. Click refresh icon to manually check
2. Verify the changes were actually made to GitHub
3. Check if you have local modifications that might be conflicting
4. Ensure auto-sync is enabled

### Performance Issues

1. Disable auto-sync if experiencing lag
2. Increase polling interval in code if needed
3. For large repos, use manual sync instead

### Notification Issues

1. Notification auto-dismisses after 5 seconds - click "Dismiss" to close immediately
2. Check "Last sync" timestamp to verify polling is active
3. Missing notification? Refresh button shows pending changes

## Technical Details

### Change Detection Algorithm

```
1. Fetch current file tree from GitHub API
2. For each file:
   a. Check if SHA changed from last known SHA
   b. If SHA different, fetch file content
   c. Hash the content
   d. Compare content hash with previous hash
   e. If different, mark as changed
3. For deleted files:
   - Remove from tracked files
   - Mark as deleted
```

### File Hash Calculation

- Uses simple JavaScript hash function for content comparison
- Provides 32-bit integer hash of file content
- Prevents unnecessary syncs due to metadata-only changes

### Listener Pattern

```javascript
// Register listener
const unsubscribe = poller.onChange((changeData) => {
  // Handle changes
});

// Unsubscribe on cleanup
unsubscribe();
```

## Future Enhancements

1. **Webhook Integration**
   - Real-time notifications instead of polling
   - Lower latency, reduced API usage

2. **Conflict Resolution**
   - Better handling when local and remote changes conflict
   - Three-way merge support

3. **Selective Sync**
   - Choose which files to auto-sync
   - Ignore patterns for certain file types

4. **Sync History**
   - View previous syncs
   - Rollback to specific sync points

5. **Multi-User Awareness**
   - See who made external changes
   - Comment on synced changes

## API Reference

### GitHubFilePoller Class

```javascript
class GitHubFilePoller {
  constructor(githubToken)
  
  async checkForChanges(owner, repo, branch)
  async fetchFileTree(owner, repo, branch)
  async fetchFileContent(owner, repo, path, branch)
  
  startPolling(owner, repo, branch, interval = 10000)
  stopPolling()
  
  onChange(callback) -> unsubscribe function
  initializeHashes(files)
}
```

### Change Object Structure

```javascript
{
  type: 'modified' | 'added' | 'deleted',
  path: string,
  sha: string | null  // Only for modified/added
}
```

### Change Data Structure

```javascript
{
  changes: Array<Change>,
  status: 'success' | 'error',
  filesChecked: number
}
```

## Examples

### Basic Setup
The auto-sync is automatically set up when you connect a GitHub repository. No additional configuration needed.

### Disable Auto-Sync
```javascript
// Click the bell icon in the header
const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
// Changes won't be auto-synced
```

### Manual Sync Check
```javascript
// Click the refresh icon
const changeData = await pollerRef.current.checkForChanges(
  owner, repo, branch
);
```

## Best Practices

1. **Keep Auto-Sync Enabled**
   - Ensures you always have the latest code
   - Prevents merge conflicts with external changes

2. **Review External Changes**
   - Check the notification to see what changed
   - Be aware of changes made by collaborators

3. **Commit Regularly**
   - Makes it easier to understand external changes
   - Provides clear history of modifications

4. **Use Comments**
   - Add commit messages explaining changes
   - Helps track who made what changes

5. **Monitor Last Sync Time**
   - Verify polling is active
   - Understand sync freshness

## FAQ

**Q: Does polling affect my performance?**
A: No, polling runs in the background and uses minimal resources. The API calls are efficient.

**Q: What happens if I have unsaved changes?**
A: Your unsaved changes are preserved. Auto-sync updates the cache but doesn't affect your editor content if you've modified it locally.

**Q: Can I use this with a private repository?**
A: Yes, as long as your GitHub token has access to the private repository.

**Q: What's the maximum repository size this works with?**
A: Works with repositories of any size. For very large repos (10,000+ files), consider disabling auto-sync or increasing the polling interval.

**Q: Does auto-sync work offline?**
A: No, you need an internet connection to GitHub. Auto-sync will resume when connection is restored.
