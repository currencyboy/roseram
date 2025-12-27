# Machine Setup Integration Guide

## Overview

This guide explains how to integrate the new Incremental Machine Setup system into your existing preview components and replace the current broken preview experience.

## Current State

**Old Preview System Issues:**
- ❌ Automatically tries to deploy in background (invisible)
- ❌ Users see "Launching Preview... Starting fly.io machine" indefinitely
- ❌ No way to see what's happening
- ❌ No way to pause or control the process
- ❌ Hard to debug when it fails

**New System Benefits:**
- ✅ Step-by-step visible process
- ✅ User controls when each step executes
- ✅ Real-time logs showing what's happening
- ✅ Clear error messages if something fails
- ✅ Can retry individual steps
- ✅ Shows preview URL immediately

## Files Created

1. **Database Migration**
   - `supabase/migrations/add_incremental_machine_setup.sql`
   - Creates `machine_setup_sessions` table for tracking progress

2. **API Endpoint**
   - `app/api/machine-setup/route.js`
   - Handles GET (initialize session) and POST (execute step)

3. **React Component**
   - `components/IncrementalMachineSetup.jsx`
   - Displays the 4-step setup UI with progress tracking

4. **Service Functions**
   - `lib/machine-setup-service.js`
   - Reusable functions for managing setup sessions

5. **Documentation**
   - `INCREMENTAL_MACHINE_SETUP_GUIDE.md` - Complete guide
   - `MACHINE_SETUP_INTEGRATION_GUIDE.md` - This file

## Integration Steps

### Step 1: Deploy Database Migration

Execute the SQL migration in your Supabase dashboard:

```bash
# Option A: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/add_incremental_machine_setup.sql
# 3. Paste and Run

# Option B: Via CLI (if using Supabase CLI)
supabase migration up
```

**Verify the table was created:**
```sql
SELECT * FROM machine_setup_sessions LIMIT 1;
```

### Step 2: Update Preview Components

The simplest approach is to replace your existing preview panels with the new component:

#### Option A: Replace Existing Preview Component

Find your main preview component (likely `PreviewPanel.jsx` or `UnifiedPreviewPanel.jsx`) and swap it:

**Before:**
```jsx
import { FlyPreview } from "@/components/FlyPreview";
import { UnifiedPreviewPanel } from "@/components/UnifiedPreviewPanel";

export function CodeBuilder() {
  return (
    <div>
      {/* Old broken preview */}
      <FlyPreview projectId={...} />
    </div>
  );
}
```

**After:**
```jsx
import { IncrementalMachineSetup } from "@/components/IncrementalMachineSetup";

export function CodeBuilder() {
  return (
    <div>
      {/* New step-by-step setup */}
      <IncrementalMachineSetup
        projectId={projectId}
        githubRepo={githubRepo}
        githubBranch={githubBranch}
        onSetupComplete={(data) => {
          console.log("Preview ready at:", data.previewUrl);
          // Optionally load the preview in an iframe
          loadPreview(data.previewUrl);
        }}
        onError={(error) => {
          console.error("Setup failed:", error);
        }}
      />
    </div>
  );
}
```

#### Option B: Parallel Integration (Safer)

Keep the old component but add the new one as an optional flow:

```jsx
import { IncrementalMachineSetup } from "@/components/IncrementalMachineSetup";

export function PreviewSection() {
  const [useNewSetup, setUseNewSetup] = useState(false);

  if (useNewSetup) {
    return (
      <IncrementalMachineSetup
        projectId={projectId}
        githubRepo={githubRepo}
        onSetupComplete={handleSetupComplete}
      />
    );
  }

  return (
    <div>
      <button onClick={() => setUseNewSetup(true)}>
        Try New Step-by-Step Setup
      </button>
      {/* Old preview component */}
      <FlyPreview ... />
    </div>
  );
}
```

#### Option C: Context-Based Toggle

Create a setup preference in your context:

```jsx
// In UserSessionProvider or similar
const [preferredSetupFlow, setPreferredSetupFlow] = useState('new'); // 'new' or 'legacy'

// In PreviewPanel
{preferredSetupFlow === 'new' ? (
  <IncrementalMachineSetup {...props} />
) : (
  <FlyPreview {...props} />
)}
```

### Step 3: Update Existing Preview Flow

If your app currently shows a preview tab, update it to use the new component:

**Example: In `CodeBuilder.jsx` or similar**

```jsx
export function CodeBuilder() {
  const [activeTab, setActiveTab] = useState('code'); // 'code' or 'preview'
  const [projectId] = useState(getCurrentProjectId());
  const [githubRepo] = useState(getCurrentGithubRepo());

  return (
    <div className="flex gap-4">
      {/* Code editor tab */}
      <div className="flex-1">
        <CodeEditor />
      </div>

      {/* Preview tab */}
      {activeTab === 'preview' && (
        <div className="flex-1 border-l">
          <IncrementalMachineSetup
            projectId={projectId}
            githubRepo={githubRepo}
            onSetupComplete={(data) => {
              // Once setup is complete, show the preview in an iframe
              loadPreviewIframe(data.previewUrl);
            }}
          />
        </div>
      )}
    </div>
  );
}
```

### Step 4: Handle Setup Completion

After setup completes, you'll want to load the preview:

```jsx
// In your preview component
import { IncrementalMachineSetup } from "@/components/IncrementalMachineSetup";

export function PreviewPanel() {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);

  const handleSetupComplete = (data) => {
    setPreviewUrl(data.previewUrl);
    setSetupComplete(true);
    
    // Optionally navigate or show the preview
    window.open(data.previewUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col">
      {!setupComplete ? (
        <IncrementalMachineSetup
          projectId={projectId}
          githubRepo={githubRepo}
          onSetupComplete={handleSetupComplete}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b p-4">
            <p className="text-sm text-gray-600">Preview ready:</p>
            <a 
              href={previewUrl} 
              target="_blank" 
              className="text-blue-600 hover:underline"
            >
              {previewUrl}
            </a>
          </div>
          <iframe 
            src={previewUrl} 
            className="flex-1 border-0"
          />
        </div>
      )}
    </div>
  );
}
```

## Migration Path

### Phase 1: Soft Launch (Week 1)
- Deploy database migration
- Deploy new component
- Add as optional "New Setup" button in existing preview
- Gather feedback

### Phase 2: Roll Out (Week 2)
- Make new setup the default for new projects
- Keep old component available as fallback
- Monitor error rates

### Phase 3: Cleanup (Week 3)
- Migrate remaining projects
- Remove old preview component
- Archive old code

## Testing Before Integration

### Manual Testing Checklist

1. **Database**
   - [ ] Migration runs without errors
   - [ ] `machine_setup_sessions` table exists
   - [ ] RLS policies are applied

2. **API Endpoints**
   - [ ] GET `/api/machine-setup` creates new session
   - [ ] POST `/api/machine-setup` with step 1 returns success
   - [ ] All 4 steps complete without errors
   - [ ] Error handling returns proper error messages

3. **Component**
   - [ ] Component renders without errors
   - [ ] Session initializes on load
   - [ ] Step buttons are clickable
   - [ ] Each step executes and shows results
   - [ ] Logs update in real-time
   - [ ] Completion shows preview URL

4. **Integration**
   - [ ] Works in existing preview panel
   - [ ] Works with different repository types
   - [ ] Works with different branch names
   - [ ] Handles authentication correctly

### Test Script

```javascript
// In browser console while preview is loading
async function testMachineSetup() {
  const token = localStorage.getItem('auth_token'); // Adjust as needed
  const projectId = 'test-project-id';
  const githubRepo = 'https://github.com/user/repo';

  try {
    // Test 1: Initialize session
    const session = await (await fetch(
      `/api/machine-setup?projectId=${projectId}&githubRepo=${encodeURIComponent(githubRepo)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )).json();
    
    console.log('✓ Session initialized:', session.session.id);

    // Test 2: Execute step 1
    const step1 = await (await fetch('/api/machine-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId: session.session.id,
        stepNumber: 1
      })
    })).json();
    
    console.log('✓ Step 1 completed:', step1.stepResult.status);
    console.log('Details:', step1.stepResult.details);

  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}

testMachineSetup();
```

## Environment Variables

Ensure these are set for the new system to work:

```env
# GitHub Integration (required for Step 1)
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=github_pat_xxx
GITHUB_ACCESS_TOKEN=github_pat_xxx

# Fly.io Integration (required for Steps 2-4)
NEXT_FLY_IO_TOKEN=FlyV1 xxx
NEXT_PUBLIC_FLY_IO_TOKEN=FlyV1 xxx

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=eyJ...
```

## Monitoring & Logging

The system logs all setup activities. You can monitor them:

```sql
-- See all setup sessions
SELECT * FROM machine_setup_sessions 
ORDER BY created_at DESC LIMIT 10;

-- See failed setups
SELECT * FROM machine_setup_sessions 
WHERE overall_status = 'failed'
ORDER BY created_at DESC;

-- See in-progress setups
SELECT * FROM machine_setup_sessions 
WHERE overall_status = 'in_progress'
ORDER BY created_at DESC;

-- Get stats
SELECT 
  overall_status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM machine_setup_sessions
GROUP BY overall_status;
```

## Rollback Plan

If issues arise, you can quickly roll back:

1. **Disable new component:**
   ```jsx
   // Set useNewSetup to false everywhere
   const useNewSetup = false; // Toggle to disable
   ```

2. **Keep old component running:**
   - Old `FlyPreview` component remains functional
   - Users can continue using it

3. **Drop new table (if needed):**
   ```sql
   DROP TABLE IF EXISTS machine_setup_sessions CASCADE;
   ```

## Getting Help

If you encounter issues during integration:

1. **Check the logs:**
   - Browser console for component errors
   - Network tab for API errors
   - Server logs for endpoint issues

2. **Review the setup:**
   ```sql
   SELECT * FROM machine_setup_sessions WHERE project_id = 'xxx';
   ```

3. **Common Issues:**
   - **"Session not found"** - Check RLS policies
   - **"Failed to detect project"** - Verify GitHub token
   - **"Machine allocation failed"** - Check Fly.io token
   - **"Step takes forever"** - Check API logs for errors

## Next: Advanced Customization

Once integrated, you can customize:

- **Appearance:** Edit `IncrementalMachineSetup.jsx` styles
- **Steps:** Add more steps if needed
- **Behavior:** Modify API endpoints for your setup flow
- **Automation:** Auto-advance steps instead of user-controlled

See `INCREMENTAL_MACHINE_SETUP_GUIDE.md` for customization details.
