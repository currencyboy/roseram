# Integrated Roseram IDE Guide

## Overview

This guide explains how to integrate all the components together to create a seamless development experience:

1. **Pull Config from Status Tab** - Repository and branch info
2. **Auto-start Preview** - One-Click Preview with live dev server
3. **Grok Code Generation** - AI-powered code generation with chat
4. **Auto-commit to Forked Branch** - Generated code commits with diff preview
5. **Publish to Main** - "Push to GitHub" button publishes to main branch

---

## Architecture

```
CodeBuilder (main.tsx)
├── Status Tab (currentBranch, repository)
├── AutoPreview (pulls config from Status)
├── SmartCodeChat (generates code with Grok)
├── GrokDiffCommitModal (diff review)
└── Push to GitHub button (publishes to main)
```

---

## Component Integration Steps

### Step 1: Configure AutoPreview to Use Status Tab

In `CodeBuilder.jsx`, pass the status info to AutoPreview:

```jsx
<EnhancedPreview
  projectId={projectId}
  currentBranch={currentBranch}
  repository={repository}
  autoStart={true}  // Auto-start when repo is selected
  onPreviewReady={(preview) => {
    console.log('Preview started:', preview);
  }}
/>
```

**What happens:**
- AutoPreview reads `currentBranch.owner`, `currentBranch.repo`, `currentBranch.name`
- Automatically starts a preview when a branch is selected
- Shows live dev server in preview panel

### Step 2: Connect Grok Code Generation to Auto-commit

In `CodeBuilder.jsx` (or `SmartCodeChat.jsx`), integrate the auto-commit hook:

```jsx
import { useGrokAutoCommit } from '@/lib/useGrokAutoCommit';
import { GrokDiffCommitModal } from './GrokDiffCommitModal';

function CodeBuilder() {
  const { 
    handleGrokGenerated, 
    approveAndCommit, 
    rejectAndCancel,
    showDiffModal, 
    pendingDiff, 
    commitState 
  } = useGrokAutoCommit({
    owner: repository?.owner,
    repo: repository?.name,
    branch: currentBranch?.name,
    token: github.token,
    fileCache: fileCache,
    onCommitSuccess: (result) => {
      // Refresh preview after commit
      setRefreshTrigger(prev => prev + 1);
      // Show success message
      alert(`✅ Changes committed: ${result.commitSha}`);
    },
    onCommitError: (error) => {
      setError(error);
    },
  });

  // Handle code generation from Grok
  const handleApplyPendingChanges = (files, prompt) => {
    handleGrokGenerated(files, prompt);
  };

  return (
    <>
      <SmartCodeChat
        onApplyChanges={handleApplyPendingChanges}
        // ... other props
      />
      
      <GrokDiffCommitModal
        isOpen={showDiffModal}
        pendingDiff={pendingDiff}
        commitState={commitState}
        onApprove={approveAndCommit}
        onReject={rejectAndCancel}
      />
    </>
  );
}
```

**What happens:**
1. User enters Grok prompt in chat
2. SmartCodeChat generates code
3. `handleGrokGenerated()` is called with generated files
4. Diff modal opens showing changes
5. User reviews and clicks "Approve & Commit"
6. Changes auto-commit to the forked branch (e.g., `roseram-edit-xxx`)
7. Preview refreshes to show the changes

### Step 3: Integration with "Push to GitHub" Button

The existing "Push to GitHub" button at the top right of CodeBuilder already handles publishing to main:

**Current button location:** `components/CodeBuilder.jsx` lines ~1005-1018

**Current handler:** `handlePushToMain` (lines ~514-589)

**What it does:**
- Takes all `fileChanges` or `fileCache`
- POSTs to `/api/github/push-to-main`
- Creates a commit on the default branch (main)
- Updates the ref to point to the new commit

**Integration:**
- When user clicks "Push to GitHub", it publishes the forked branch commits to main
- The workflow is:
  1. Generate code with Grok → commits to `roseram-edit-xxx`
  2. Click "Push to GitHub" → publishes to `main`
  3. Changes are now in the main branch

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Status Tab                                   │
│        (Shows: owner, repo, branch, GitHub token)               │
└────────────┬────────────────────────────────────────────────────┘
             │
      ┌──────▼──────────┐
      │  AutoPreview    │
      │  Auto-starts    │ ← Pulls config from Status
      │  dev server     │
      └────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SmartCodeChat                                 │
│              (User: "Add a button...")                           │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │   Grok (X.AI)      │ ← Generates code
    │   API Call         │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────────┐
    │ handleGrokGenerated()   │ ← Processes generated files
    │ Creates diffs          │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  GrokDiffCommitModal       │ ← User reviews changes
    │  Shows: files, diff, msg   │
    │  Approve or Reject         │
    └────────┬───────────────────┘
             │ [Approve]
             ▼
    ┌────────────────────────────┐
    │  /api/github/commit        │ ← Auto-commit to branch
    │  Creates commit SHA        │
    │  Updates branch ref        │
    └────────┬───────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │  Preview Refreshes         │ ← Shows updated app
    │  (dev server hot-reload)   │
    └────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│          "Push to GitHub" Button (Top Right)                    │
│          User clicks to publish forked branch → main             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │ handlePushToMain()         │ ← Existing handler
    │ /api/github/push-to-main   │
    │ Creates commit on main     │
    └────────────────────────────┘
```

---

## Files Created/Modified

### New Files:
1. **`lib/grok-commit-integration.js`**
   - Utility functions for processing diffs and committing

2. **`lib/useGrokAutoCommit.js`**
   - React hook for integrating code generation with auto-commit

3. **`app/api/github/commit/route.js`**
   - GitHub API endpoint for auto-committing to any branch

4. **`components/GrokDiffCommitModal.jsx`**
   - Modal component for reviewing diffs before commit

### Modified Files:
1. **`components/AutoPreview.jsx`**
   - Now reads config from `currentBranch` and `repository`
   - Supports `autoStart` prop to auto-start preview

---

## Usage Instructions

### For End Users:

1. **Connect GitHub**
   - Click Settings in Status tab
   - Connect your GitHub account

2. **Select a Repository**
   - Choose a repo from the Integration Status
   - A working branch (roseram-edit-xxx) is created automatically

3. **Preview Starts Automatically**
   - Live dev server boots up
   - See your app in the preview panel

4. **Generate Code with Grok**
   - Type in the chat: "Add a button that says click me"
   - Grok generates the code
   - Diff modal appears showing changes

5. **Review and Commit**
   - Review the changes in the diff modal
   - Customize the commit message if needed
   - Click "Approve & Commit"
   - Changes are committed to your working branch

6. **Publish to Main**
   - When ready, click "Push to GitHub" at top right
   - Changes are published to the main branch

### For Developers:

To integrate these components into your CodeBuilder instance:

```jsx
import { useGrokAutoCommit } from '@/lib/useGrokAutoCommit';
import { GrokDiffCommitModal } from '@/components/GrokDiffCommitModal';

export function CodeBuilder() {
  const { handleGrokGenerated, approveAndCommit, rejectAndCancel, showDiffModal, pendingDiff, commitState } = useGrokAutoCommit({
    owner: repository?.owner,
    repo: repository?.name,
    branch: currentBranch?.name,
    token: github.token,
    fileCache: fileCache,
    onCommitSuccess: (result) => {
      // Refresh preview
      setRefreshTrigger(prev => prev + 1);
    },
  });

  return (
    <>
      <GrokDiffCommitModal
        isOpen={showDiffModal}
        pendingDiff={pendingDiff}
        commitState={commitState}
        onApprove={approveAndCommit}
        onReject={rejectAndCancel}
      />
      {/* ... rest of component */}
    </>
  );
}
```

---

## API Endpoints

### 1. `/api/auto-preview` (Existing - Now Enhanced)
- **POST** - Start a new preview
- **GET** - Get preview status
- **DELETE** - Stop a preview

**Config:** Reads from `currentBranch` props

### 2. `/api/github/commit` (New)
- **POST** - Commit files to a specific branch
- **Required:** `owner`, `repo`, `branch`, `files`, `token`
- **Used by:** `useGrokAutoCommit` hook

### 3. `/api/github/push-to-main` (Existing)
- **POST** - Publish commits to main branch
- **Used by:** "Push to GitHub" button in CodeBuilder

---

## Error Handling

The system includes error handling for:

1. **Missing Repository Info**
   - ✅ Gracefully handled - shows error in AutoPreview
   
2. **Failed Commits**
   - ✅ Diff modal shows error message
   - ✅ User can retry with different settings

3. **Auth Failures**
   - ✅ GitHub token errors caught
   - ✅ User prompted to re-authenticate

4. **Preview Failures**
   - ✅ AutoPreview shows status and errors
   - ✅ Retry button available

---

## Testing Checklist

- [ ] AutoPreview auto-starts when repo is selected
- [ ] AutoPreview pulls correct owner/repo/branch from Status tab
- [ ] Grok generates code successfully
- [ ] Diff modal shows generated changes
- [ ] Commit message is editable
- [ ] Approve commit triggers API call
- [ ] Commit SHA is returned and logged
- [ ] Preview refreshes after commit
- [ ] "Push to GitHub" button publishes to main
- [ ] Changes appear in main branch on GitHub

---

## Troubleshooting

### Preview won't start
- Check that GitHub is connected in Status tab
- Verify current branch is set
- Check browser console for errors

### Diff modal won't appear
- Ensure fileCache is populated
- Check that generated files have valid paths
- Verify commit hook is properly integrated

### Commit fails
- Check GitHub token scopes (needs `repo` access)
- Verify branch exists on GitHub
- Check API response errors in console

### Push to main fails
- Verify write access to main branch
- Check GitHub token validity
- Ensure no conflicts with main branch

---

## Future Enhancements

- [ ] Multi-file diffs with better visualization
- [ ] Selective commit (choose which files to commit)
- [ ] Commit history viewer
- [ ] Automatic PR creation for main branch publish
- [ ] Live collaboration (multiple users on same branch)
- [ ] Commit conflict resolution UI
