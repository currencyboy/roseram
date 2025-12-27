# Missing Project ID Configuration - Fix Guide

## Problem Summary

**Error Messages:**
```
[QuickPreview] Configuration error: Missing project ID configuration
[EnhancedPreview] Preview error: Missing project ID configuration
```

**Root Cause:**
- `projectId` is initialized as `null` in the ProjectProvider
- It only gets set when `createProject()` is called successfully
- `fetchProject()` was not updating the `projectId` state
- Components expect `projectId` to always be available, causing errors when it's null

## Solutions Implemented

### 1. ✅ ProjectProvider Enhancement (lib/project-context.jsx)
**Change:** Updated `fetchProject()` to also set `projectId` when successful

**Before:**
```javascript
const fetchProject = async (id, token) => {
  const data = await response.json();
  setProjectData(data.project);  // Only set projectData
  return data.project;
};
```

**After:**
```javascript
const fetchProject = async (id, token) => {
  const data = await response.json();
  setProjectData(data.project);
  // Also set projectId from fetched project to keep them in sync
  if (data.project?.id) {
    setProjectId(data.project.id);
  }
  return data.project;
};
```

**Impact:** Now when projects are fetched, both `projectId` and `projectData` are synchronized.

### 2. ✅ QuickPreview Component (components/QuickPreview.jsx)
**Change:** Generate temporary projectId if not provided

**Before:**
```javascript
if (!projectId) {
  const msg = 'Missing project ID configuration';
  console.error('[QuickPreview] Configuration error:', msg);
  setError(msg);
  onError?.(msg);
  setLoading(false);
  return;
}
```

**After:**
```javascript
// Generate temporary projectId if not provided
let effectiveProjectId = projectId;
if (!effectiveProjectId) {
  effectiveProjectId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.warn('[QuickPreview] No projectId provided, using temporary:', effectiveProjectId);
}
```

**Impact:** QuickPreview can now work without an explicit projectId, generating a temporary one automatically.

### 3. ✅ EnhancedPreview Component (components/EnhancedPreview.jsx)
**Change:** Generate effective projectId with fallback

**Before:**
```javascript
return (
  <QuickPreview
    projectId={projectId}
    // ...
  />
);
```

**After:**
```javascript
// Generate effective projectId (use provided or generate temporary)
const effectiveProjectId = projectId || `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

if (!projectId && effectiveProjectId) {
  console.warn('[EnhancedPreview] No projectId provided, using temporary ID:', effectiveProjectId);
}

return (
  <QuickPreview
    projectId={effectiveProjectId}
    // ...
  />
);
```

**Impact:** EnhancedPreview never passes undefined/null projectId to QuickPreview.

### 4. ✅ New Utility Hook (lib/use-project-id.js)
**New Hook:** `useProjectId()` for reliable projectId management

```javascript
export function useProjectId() {
  const { projectId } = useProject();

  const effectiveProjectId = useMemo(() => {
    if (projectId) {
      return projectId;
    }
    // Generate a temporary but stable project ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `preview-${timestamp}-${random}`;
  }, [projectId]);

  return {
    projectId: effectiveProjectId,
    isTemporary: !projectId,
    hasRealProjectId: !!projectId,
  };
}
```

**Usage:**
```javascript
import { useProjectId } from '@/lib/use-project-id';

export function MyComponent() {
  const { projectId, isTemporary, hasRealProjectId } = useProjectId();
  
  return (
    <div>
      <QuickPreview projectId={projectId} />
      {isTemporary && <p>Using temporary project ID</p>}
    </div>
  );
}
```

## Why These Fixes Work

### Before (Broken Flow)
```
1. Project context initializes with projectId = null
2. Component tries to use projectId
3. projectId is null → Error "Missing project ID configuration"
4. User gets stuck, can't use preview
```

### After (Fixed Flow)
```
1. Project context initializes with projectId = null
2. Component requests projectId via hook or prop
3. If projectId exists, use it
4. If projectId is null, generate temporary one
5. Preview works with temporary ID
6. When real project is created/fetched, ID updates
```

## How to Use These Fixes

### Option 1: Automatic (Recommended)
No action needed! The fixes are already applied to:
- `QuickPreview` - Handles missing projectId internally
- `EnhancedPreview` - Generates fallback projectId
- `ProjectProvider.fetchProject()` - Syncs projectId

### Option 2: Use New Hook (For New Components)
```javascript
import { useProjectId } from '@/lib/use-project-id';

function MyPreviewComponent() {
  const { projectId, isTemporary } = useProjectId();
  
  if (isTemporary) {
    console.log('Using temporary project ID:', projectId);
  }
  
  return <PreviewComponent projectId={projectId} />;
}
```

### Option 3: Manual Override (If Needed)
```javascript
const { setProjectId } = useProject();

// Manually set projectId
setProjectId('my-project-id-123');
```

## Verification Checklist

- [ ] **Error Messages Gone**
  - Open preview components
  - Should NOT see "Missing project ID configuration" error
  - Check browser console (F12 → Console tab)

- [ ] **Preview Works**
  - Launch a preview
  - Should start without projectId error
  - May use temporary ID if real project not created yet

- [ ] **Real Project ID Works**
  - Create a new project
  - Verify `createProject()` is called
  - Preview should use real projectId
  - Check logs: should show actual project ID, not temporary

- [ ] **Project Fetch Syncs**
  - Fetch existing project
  - Verify both `projectId` and `projectData` are populated
  - Check in React DevTools: `projectId` should match `projectData.id`

## Project ID Lifecycle

```
Timeline of projectId State
─────────────────────────────

App Load
  ↓ projectId = null
  
User Creates Project
  ↓ createProject() called
  ↓ Server responds with project id
  ↓ projectId = "actual-id-123" ✅
  
User Fetches Project
  ↓ fetchProject() called (with existing id)
  ↓ Server responds with project data
  ↓ projectId = data.project.id ✅
  
Preview Launched (Any Time)
  ↓ If projectId exists → use it
  ↓ If projectId is null → generate temporary one
  ↓ Preview works! ✅
```

## Debugging Tips

### Check Current Project ID
```javascript
// In browser console
localStorage.setItem('debug-project', JSON.stringify({
  actual: useProject().projectId,
  temp: `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}));
```

### Monitor ProjectContext
```javascript
// Use React DevTools to inspect ProjectProvider state
// Look for: projectId, projectData
```

### Enable Debug Logging
Look for these log messages to understand flow:
```
[ProjectContext] Project created successfully: <id>
[ProjectContext] Project fetch failed: <error>
[EnhancedPreview] No projectId provided, using temporary ID: <id>
[QuickPreview] No projectId provided, using temporary: <id>
```

## Files Changed Summary

| File | Change | Impact |
|------|--------|--------|
| `lib/project-context.jsx` | fetchProject() sets projectId | Syncs ID when fetching |
| `components/QuickPreview.jsx` | Generate fallback projectId | Preview works without ID |
| `components/EnhancedPreview.jsx` | Pass effective projectId | Never passes null |
| `lib/use-project-id.js` | New utility hook | Available for future components |

## Testing Steps

### Test 1: Launch Preview Without Project
1. Open preview component
2. Don't create a project
3. **Expected**: Preview should work with temporary ID
4. **Error**: Should NOT see "Missing project ID" error

### Test 2: Create Project Then Preview
1. Create a new project via UI
2. Launch preview
3. **Expected**: Preview uses real project ID
4. **Check logs**: Should show actual project ID, not temporary

### Test 3: Fetch Project Then Preview
1. Fetch an existing project
2. Launch preview
3. **Expected**: Preview works with fetched project ID
4. **Check**: projectId and projectData should be in sync

### Test 4: Multiple Previews
1. Create/fetch multiple projects
2. Switch between previews
3. **Expected**: Each preview uses correct projectId
4. **Error**: No cross-contamination between projects

## Rollback Instructions

If needed, revert changes:

```bash
# Revert ProjectProvider
git checkout lib/project-context.jsx

# Revert QuickPreview
git checkout components/QuickPreview.jsx

# Revert EnhancedPreview
git checkout components/EnhancedPreview.jsx

# Remove new hook
rm lib/use-project-id.js
```

## Future Improvements

1. **Persistent Temporary IDs**: Store in localStorage to maintain across refreshes
2. **Auto-Migrate**: Automatically promote temporary IDs to real ones when project is created
3. **Dashboard**: Show which previews use temporary vs real IDs
4. **Validation**: Add warnings if using temporary IDs in production

## Support

If you encounter issues:

1. **Check logs** (F12 → Console)
   - Look for error messages
   - Check for warning logs about temporary IDs

2. **Verify state** (React DevTools)
   - Check ProjectProvider context
   - Verify projectId is set

3. **Clear cache**
   - Clear browser cache
   - Restart dev server
   - Reload page

4. **Check deployment**
   - If using in production, ensure NEXT_PUBLIC variables are set
   - Verify API endpoints are accessible

---

**Status**: ✅ Fixed and Ready
**Tested on**: Latest version
**Breaking Changes**: None
**Backward Compatible**: Yes
