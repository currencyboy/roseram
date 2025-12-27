# Modern AI IDE Architecture Refactoring

## Overview

This document describes the refactoring of the Roseram Builder application to follow modern AI IDE patterns (similar to Cursor, GitHub Codespaces, Replit, and Gitpod).

## The Problem

Previously, the application had a disconnected architecture:
- GitHub integration created branches separately from preview system
- File Explorer didn't show the working branch
- Chat generation wasn't synced with branch/preview
- Components operated independently without a unified coordination system

## The Solution: BranchSyncContext

A new unified context manages the entire workflow:

```
┌─────────────────────────────────────────────────────────────┐
│                    BranchSyncContext                         │
│                  (Single Source of Truth)                    │
│                                                               │
│  • currentBranch (auto-generated branch name, metadata)     │
│  • repository (owner, repo, defaultBranch)                  │
│  • filesSynced (boolean, track if files loaded)             │
│  • syncedFiles (array of files in current branch)           │
└─────────────────────────────────────────────────────────────┘
         ↑              ↑              ↑              ↑
         │              │              │              │
    ┌────┴──┐      ┌────┴──┐      ┌───┴───┐      ┌──┴────┐
    │        │      │        │      │       │      │       │
┌───┴──┐  ┌──┴──┐  ┌┴──┐  ┌──┴──┐  ┌┴──┐  ┌──┴──┐ │       │
│GitHub│  │File │  │Prev│ │Chat │  │Rev│  │Push │ │Status │
│Modal │  │Expl │  │iew │ │Agent│  │ision│      │ │Bar    │
└──────┘  └─────┘  └─────┘ └─────┘  └────┘  └─────┘ │       │
                                                  └───┴──────┘
```

## New Workflow

### 1. User Connects Repository
```
EnhancedIntegrationModal
  ↓
User enters GitHub token
  ↓
Selects repository
  ↓
BranchSyncContext.createBranch() called
  ↓
Auto-generated branch created on GitHub (e.g., "roseram-edit-1734xxx-abc123")
  ↓
Branch info stored in BranchSyncContext
```

### 2. All Components Sync with Current Branch
- **FileExplorer**: Displays current branch name, loads files from it
- **Preview**: Shows live preview from working branch (not main)
- **SmartCodeChat**: Shows branch status, syncs code generation
- **Preview Panel**: Shows live preview of branch contents
- **Push Button**: Commits/pushes to the working branch

### 3. Chat → Code Generation → Sync → Preview
```
User writes prompt
  ↓
SmartCodeChat uses BranchSyncContext for context
  ↓
AI generates code changes
  ↓
onGenerateCode callback applied to files
  ↓
Files synced to FileExplorer via BranchSyncContext
  ↓
Preview updates automatically
  ↓
Preview updates in real-time
```

## Key Files

### New Files
- **lib/branch-sync-context.jsx** - Central context for branch coordination
- **lib/github-api-service.js** - Unified GitHub API wrapper
- **lib/preview-manager.js** - Preview integration respecting current branch
- **ARCHITECTURE_REFACTOR.md** - This documentation

### Updated Files
- **app/layout.jsx** - Added BranchSyncProvider
- **components/EnhancedIntegrationModal.jsx** - Uses useBranchSync() instead of useWorkingBranchContext()
- **components/CodeBuilder.jsx** - Integrated BranchSyncContext, shows branch status in FileExplorer and preview
- **components/SmartCodeChat.jsx** - Uses useBranchSync() to display branch info

### Consolidated Files
- **components/IntegrationModal.jsx** - Deprecated (unused, EnhancedIntegrationModal is the standard)

## Architecture Benefits

### 1. Unified State Management
- All components read from the same BranchSyncContext
- No duplicate state or sync issues
- Changes in one component immediately visible in others

### 2. Modern AI IDE Pattern
- Matches industry-standard flow (Cursor, Codespaces, Replit)
- Create branch → Preview → Edit → Sync pattern
- Forkless workflow (minimal permissions needed)

### 3. Reduced Redundancy
- Removed duplicate modal components
- Centralized GitHub API operations
- Single source of truth for branch information

### 4. Better User Experience
- Clear indication of working branch everywhere
- Live sync between chat, code, and preview
- Automatic commit to the same branch

## Component Integration Points

### EnhancedIntegrationModal
- **Triggers**: When user clicks "Connect GitHub"
- **Actions**: 
  1. Validates GitHub token
  2. Lists user's repositories
  3. On repo selection, calls `BranchSyncContext.createBranch()`
- **Updates**: BranchSyncContext with branch info

### CodeBuilder
- **Reads from**: BranchSyncContext.currentBranch
- **Displays**: Branch name in FileExplorer header and status bar
- **Uses**: Current branch for StackBlitz forking

### SmartCodeChat
- **Reads from**: BranchSyncContext.currentBranch
- **Displays**: Branch indicator when code is generated
- **Action**: Generated files automatically sync to the branch

### FileExplorer (part of CodeBuilder)
- **Reads from**: BranchSyncContext
- **Displays**: Current branch name and status
- **Updates**: BranchSyncContext when files are loaded

## Data Flow Example

```
1. User in EnhancedIntegrationModal:
   setGithubToken("ghp_xxx")
   ↓
   handleGithubRepoSelect({owner: "user", name: "my-repo"})
   ↓
   createBranch("user", "my-repo", token, "main")
   ↓
   API POST /api/github/create-branch
   ↓
   Server creates branch "roseram-edit-1734876543-abc123"
   ↓
   BranchSyncContext.currentBranch = {
     name: "roseram-edit-1734876543-abc123",
     owner: "user",
     repo: "my-repo",
     baseBranch: "main",
     sha: "xxx",
     url: "https://github.com/user/my-repo/tree/...",
     createdAt: "2024-12-23T..."
   }

2. CodeBuilder renders:
   - Shows "🌿 Branch: roseram-edit-1..." in FileExplorer header
   - Shows "Working Branch: roseram-edit-... on user/my-repo" in status bar
   - Preview is created from the branch

3. SmartCodeChat user prompts:
   - Shows "📌 Branch: roseram-edit-..."
   - Generates code
   - Changes applied to FileExplorer
   - User clicks "Save" or generation auto-commits

4. FileExplorer:
   - Shows files from current branch
   - Displays branch indicator
   - Changes marked with yellow dot
   - Push button commits to current branch

5. Preview:
   - Shows running preview of the branch
   - Auto-refreshes when files change
   - Shows live preview of the branch
```

## Future Enhancements

### 1. Branch Switching
Add a dropdown in FileExplorer to switch between existing branches without reconnecting

### 2. PR Creation
After chat makes changes, offer one-click PR creation from working branch to main

### 3. Branch History
Track all branches created in a session, allow reverting to previous branches

### 4. Collaborative Editing
Multiple users editing the same branch simultaneously with real-time sync

### 5. Auto-commit on Generation
Chat-generated code auto-commits with "AI Generated: [summary]" message

## Migration Notes

### For Existing Code
If you have components using `useWorkingBranchContext()`:

**Before:**
```javascript
const { createWorkingBranch } = useWorkingBranchContext();
```

**After:**
```javascript
const { createBranch } = useBranchSync();
```

### For GitHub API Calls
Use the centralized GitHub API service:

**Before:**
```javascript
const response = await fetch('/api/github/create-branch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...})
});
```

**After:**
```javascript
import GitHubAPIService from '@/lib/github-api-service';
const branchInfo = await GitHubAPIService.createBranch(owner, repo, token);
```

## Testing the Refactored Flow

### Manual Test Case 1: Basic Flow
1. Open CodeBuilder
2. Click "Connect GitHub"
3. Enter GitHub token
4. Select a repository
5. ✓ Should see branch name in FileExplorer header
6. ✓ Should see "Working Branch" status bar
7. ✓ Fork should complete and preview should load

### Manual Test Case 2: Chat Integration
1. Complete Test Case 1
2. Open SmartCodeChat
3. Type a prompt like "Add a button component"
4. ✓ Should see branch indicator in chat
5. ✓ Generated code should appear
6. ✓ Should see "Branch: roseram-edit-..." in chat

### Manual Test Case 3: File Sync
1. Complete Test Case 1
2. Edit a file in the editor
3. ✓ File should show yellow modification dot
4. ✓ Click "Save" or wait for auto-save
5. ✓ Preview should update
6. ✓ StackBlitz should reflect changes

## Troubleshooting

### Issue: Branch not showing in FileExplorer header
**Solution**: Check that BranchSyncProvider is in app/layout.jsx

### Issue: Chat shows "Not connected" for branch
**Solution**: Ensure EnhancedIntegrationModal completed the full flow, check localStorage for branch data

### Issue: Preview not loading
**Solution**: Check that preview is being created from the correct branch, verify GitHub token permissions

## Summary

This refactoring transforms Roseram Builder from a disconnected set of components into a modern AI IDE with unified branch management. The BranchSyncContext serves as the orchestration layer, ensuring all components stay in sync and providing a seamless, professional coding experience.
