# Branch Resumption & Session Persistence

## Overview
The IDE now automatically detects and reuses existing roseram branches instead of creating new ones. This enables users to sign out, sign back in, and resume work on the same branch without losing their editing environment.

## How It Works

### 1. Smart Branch Detection
When a user selects a repository:

```
User selects repo → EnhancedIntegrationModal calls createBranch()
  ↓
BranchSyncContext checks:
  a) Is there a stored branch for this repo? Validate it still exists
  b) If not, search for other roseram branches in the repo
  c) If found, reuse it
  d) If none exist, create a new one
```

### 2. Session Persistence
The system stores two things in localStorage:

**Key**: `roseram_branch_sync`
**Value**:
```javascript
{
  branch: {
    name: "roseram-edit-1765383434039-108x4c",
    owner: "belonio2793",
    repo: "backlinkoo-solar-system",
    baseBranch: "main",
    sha: "9b77848171d0e04e3dd15d62552b9adcdc6408d1",
    url: "https://github.com/...",
    token: "ghp_...",
    createdAt: "2025-12-10T...",
    resumed: true  // true if reused, false if newly created
  },
  repository: {
    owner: "belonio2793",
    repo: "backlinkoo-solar-system",
    defaultBranch: "main"
  },
  filesSynced: false,
  syncedFiles: []
}
```

### 3. Resume Flow
```
User signs back in → Visits CodeBuilder
  ↓
BranchSyncProvider loads from localStorage on mount
  ↓
Sees stored branch → Validates it still exists on GitHub
  ↓
✓ Valid → Resumes using existing branch
✗ Deleted → Searches for other roseram branches or creates new one
```

## API Endpoints

### List Roseram Branches
**POST** `/api/github/list-branches`

Request:
```json
{
  "owner": "belonio2793",
  "repo": "backlinkoo-solar-system",
  "token": "ghp_..."
}
```

Response:
```json
{
  "success": true,
  "branches": [
    {
      "name": "roseram-edit-1765383434039-108x4c",
      "commit": "9b77848171d0e04e3dd15d62552b9adcdc6408d1",
      "protected": false,
      "url": "https://github.com/..."
    }
  ],
  "count": 1
}
```

### Get Branch Info
**POST** `/api/github/get-branch-info`

Request:
```json
{
  "owner": "belonio2793",
  "repo": "backlinkoo-solar-system",
  "branch": "roseram-edit-1765383434039-108x4c",
  "token": "ghp_..."
}
```

Response:
```json
{
  "success": true,
  "branch": {
    "name": "roseram-edit-1765383434039-108x4c",
    "sha": "9b77848171d0e04e3dd15d62552b9adcdc6408d1",
    "protected": false,
    "url": "https://github.com/..."
  }
}
```

## Branch Naming Convention

All working branches follow this pattern:
```
roseram-edit-{UNIX_TIMESTAMP}-{RANDOM_STRING}
```

Examples:
- `roseram-edit-1765383434039-108x4c` (created Dec 10, 2025)
- `roseram-edit-1765383500000-a7b3f2` (same day, later)

This format enables:
- Easy identification (starts with `roseram-edit-`)
- Sorting by creation date (timestamp in middle)
- Uniqueness (random suffix prevents collisions)

## Utility Functions

Available in `lib/branch-utils.js`:

```javascript
// List all roseram branches
const branches = await listRoseramBranches(owner, repo, token);

// Get info about a specific branch
const branchInfo = await getBranchInfo(owner, repo, branchName, token);

// Check if branch exists
const exists = await branchExists(owner, repo, branchName, token);

// Get branch age in hours
const ageHours = getBranchAgeHours(branchName);

// Check if branch is old (7+ days)
const isOld = isBranchOld(branchName);

// Get human-readable branch description
const desc = describeBranch({ name: "roseram-edit-1765383434039-108x4c" });
// Output: "roseram-edit-1765383434039-108x4c (1h old)"
```

## Sign-Out/Sign-In Resume Flow

```
Step 1: User A connects GitHub and starts editing
  └─ Branch created: roseram-edit-1765383434039-108x4c
  └─ Stored in localStorage

Step 2: User A signs out (or session expires)
  └─ Branch state persists in localStorage
  └─ Editor closes

Step 3: User A signs back in
  └─ Visits CodeBuilder
  └─ BranchSyncProvider loads branch from localStorage
  └─ Validates branch still exists on GitHub
  └─ Prepares preview
  └─ File explorer loads
  └─ Back to editing the same branch ✓
```

## Benefits

✅ **No duplicate branches** - Detects existing branches before creating new ones  
✅ **Session resumption** - Sign out and back in to the same branch  
✅ **Team collaboration** - Multiple users can see the same branch  
✅ **Cleanup efficient** - Single branch per repo reduces GitHub clutter  
✅ **Transparent** - Logs show whether branch was created or resumed  

## Branch Lifecycle

```
1. CREATE: roseram-edit-{timestamp}-{random}
   ├─ Stored in localStorage
   └─ Accessible on GitHub
   
2. RESUME: User signs back in
   ├─ Validated on GitHub
   ├─ Files loaded from branch
   └─ Preview restored
   
3. CLEANUP: Manual or automatic
   ├─ Old branches (7+ days) can be deleted
   ├─ User can switch to new branch
   └─ localStorage cleared on logout
```

## Future Enhancements

- **Auto-cleanup**: Delete branches older than 30 days
- **Branch picker UI**: Show user list of available branches to switch between
- **Metrics**: Track branch age, file changes, session duration
- **PR automation**: Auto-create PR when user is done editing
- **Multi-branch support**: Work on multiple branches simultaneously
- **Branch expiration**: Warn before auto-deleting old branches

## Troubleshooting

### Branch not being found
1. Check branch exists: `GET /api/github/get-branch-info`
2. Verify token has correct scopes (needs `contents:read`)
3. Check branch name matches pattern: `roseram-edit-*`

### Session not resuming
1. Clear localStorage and refresh
2. Check if branch was deleted on GitHub
3. User will need to select repo again to create new branch

### Token expired
1. User gets error on GitHub API calls
2. Must re-connect GitHub via EnhancedIntegrationModal
3. New token is stored in localStorage

## See Also
- [ARCHITECTURE_REFACTOR_SUMMARY.md](./ARCHITECTURE_REFACTOR_SUMMARY.md) - Overall architecture
- [lib/branch-sync-context.jsx](./lib/branch-sync-context.jsx) - Branch management state
- [lib/branch-utils.js](./lib/branch-utils.js) - Branch utility functions
