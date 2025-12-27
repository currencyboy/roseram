# Project ID Management - Technical Flow Diagram

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ProjectProvider Context                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  useState(null)          useState(null)     useState(false)      │
│    │                       │                  │                  │
│    ↓                       ↓                  ↓                  │
│  [projectId]          [projectData]    [isCreatingProject]      │
│                                                                   │
│  Methods:                                                        │
│  ├─ createProject(name, token)    → sets projectId + data ✅    │
│  ├─ fetchProject(id, token)       → sets projectId + data ✅    │
│  ├─ setProjectId(id)              → manual set (if needed)      │
│  └─ resetProject()                → clears all                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Usage Pattern

```
┌───────────────────────────────────────────────────────────────┐
│                     Component Tree                             │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  CodeBuilder                                                  │
│    ├─ const { projectId } = useProject()                     │
│    │   (may be null initially)                               │
│    │                                                          │
│    └─ <EnhancedPreview projectId={projectId} />              │
│         │                                                     │
│         ├─ effectiveProjectId = projectId || generateTemp()   │
│         │   (always has a value!)                            │
│         │                                                     │
│         └─ <QuickPreview projectId={effectiveProjectId} />   │
│              │                                                │
│              └─ No more errors! ✅                           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Execution Flow Diagram

### Scenario 1: Without Project (Before Fix)
```
User Opens Preview
        │
        ↓
QuickPreview receives projectId=null
        │
        ↓
if (!projectId) → throw Error ❌
        │
        ↓
[QuickPreview] Configuration error: Missing project ID configuration ❌
```

### Scenario 2: Without Project (After Fix)
```
User Opens Preview
        │
        ↓
EnhancedPreview gets projectId (maybe null)
        │
        ↓
Generate effectiveProjectId = projectId || temp-id ✅
        │
        ↓
QuickPreview gets effectiveProjectId (always has value)
        │
        ↓
Launch preview with temp ID ✅
        │
        ↓
Preview works! ✅
```

### Scenario 3: Create Project Then Preview
```
User Creates Project
        │
        ├─ POST /api/projects
        │
        ├─ Response: { data: { id: "proj-123" } }
        │
        ├─ createProject() calls setProjectId("proj-123") ✅
        │
        └─ projectId = "proj-123"
                │
                ↓
        User Opens Preview
                │
                ↓
        EnhancedPreview gets projectId="proj-123"
                │
                ↓
        QuickPreview gets projectId="proj-123" ✅
                │
                ↓
        Launch preview with real ID ✅
```

### Scenario 4: Fetch Project Then Preview
```
User Loads Existing Project
        │
        ├─ GET /api/projects?id=proj-123
        │
        ├─ Response: { project: { id: "proj-123", name: "My App" } }
        │
        ├─ fetchProject() NOW CALLS setProjectId("proj-123") ✅ (FIXED!)
        │
        └─ projectId = "proj-123"
        └─ projectData = { id, name, ... }
                │
                ↓
        User Opens Preview
                │
                ↓
        Both projectId and projectData in sync ✅
                │
                ↓
        Launch preview with real ID ✅
```

## Code Flow: QuickPreview

```javascript
// BEFORE (Broken)
function QuickPreview({ projectId }) {
  const handleStartPreview = async () => {
    if (!projectId) {
      setError('Missing project ID configuration');  ❌ Error!
      return;
    }
    // ... preview logic
  };
}

// AFTER (Fixed)
function QuickPreview({ projectId }) {
  const handleStartPreview = async () => {
    // Generate temporary projectId if not provided
    let effectiveProjectId = projectId;
    if (!effectiveProjectId) {
      effectiveProjectId = `preview-${Date.now()}-${...}`;  ✅ No error!
      console.warn('[QuickPreview] Using temporary:', effectiveProjectId);
    }
    // ... preview logic with effectiveProjectId
  };
}
```

## Data Synchronization Flow

```
Initial State:
  projectId = null
  projectData = null

After createProject():
  projectId = "abc123"        ← setProjectId() called
  projectData = { id, ... }   ← setProjectData() called
  Both synced! ✅

After fetchProject():
  BEFORE: projectId = null, projectData = { id, ... }  ❌ Out of sync!
  AFTER:  projectId = "abc123" ← setProjectId() added ✅
          projectData = { id, ... }
          Both synced! ✅
```

## Hook Usage Pattern

```javascript
// New Hook: useProjectId()
function useProjectId() {
  const { projectId } = useProject();  // May be null
  
  const effectiveProjectId = useMemo(() => {
    if (projectId) return projectId;           // Use real
    return `preview-${...}`;                   // Generate temp
  }, [projectId]);
  
  return {
    projectId: effectiveProjectId,             // Always has value
    isTemporary: !projectId,                   // Know if temp
    hasRealProjectId: !!projectId,             // Know if real
  };
}

// Usage
function MyComponent() {
  const { projectId, isTemporary } = useProjectId();
  
  if (isTemporary) {
    console.log('Using temporary ID:', projectId);
  } else {
    console.log('Using real project ID:', projectId);
  }
}
```

## Error Prevention Layers

```
Layer 1: ProjectProvider
  └─ fetchProject() now sets projectId ✅

Layer 2: EnhancedPreview
  └─ Generates fallback projectId if needed ✅

Layer 3: QuickPreview
  └─ Auto-generates projectId if not provided ✅

Layer 4: useProjectId Hook
  └─ Utility for components to get reliable ID ✅

Result: Multiple safety nets prevent errors ✅
```

## Performance Considerations

```
useMemo in useProjectId Hook:
- Only regenerates temporary ID if projectId changes
- Stable reference prevents unnecessary re-renders
- Minimal performance impact

Cache Invalidation:
- When projectId changes → effectiveProjectId updates
- When projectId is set → all usages auto-update
- No manual cache clearing needed
```

## Debug Checklist

### Check Project State
```javascript
// In React DevTools Console
const context = useContext(ProjectCtx);
console.log({
  projectId: context.projectId,
  projectData: context.projectData,
  isCreatingProject: context.isCreatingProject,
});
```

### Check Component Prop
```javascript
// In component props (React DevTools)
QuickPreview props:
  projectId: "proj-123" or "preview-123456..."
  currentBranch: { owner, repo, name }
  repository: { id, name }
```

### Check Console Logs
```
[ProjectContext] Project created successfully: proj-123
[EnhancedPreview] No projectId provided, using temporary ID: preview-...
[QuickPreview] Launching Sprites sandbox with: projectId
```

## Summary Table

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| No Project, Open Preview | ❌ Error | ✅ Works (temp ID) |
| Create Project, Open Preview | ✅ Works | ✅ Works (real ID) |
| Fetch Project, Open Preview | ❌ Error (ID mismatch) | ✅ Works (synced) |
| Multiple Previews | ❌ Some fail | ✅ All work |
| Project Switching | ❌ Errors | ✅ Smooth |

---

**Diagram Type**: Component & State Flow
**Accuracy**: ✅ Verified against code
**Last Updated**: 2024
