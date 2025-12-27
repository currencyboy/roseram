# Incremental Machine Setup - Deployment Checklist

## Pre-Deployment

- [ ] Read `IMPLEMENTATION_SUMMARY.md` for overview
- [ ] Read `MACHINE_SETUP_INTEGRATION_GUIDE.md` for integration details
- [ ] Review the 4 files created:
  - [ ] `supabase/migrations/add_incremental_machine_setup.sql`
  - [ ] `app/api/machine-setup/route.js`
  - [ ] `components/IncrementalMachineSetup.jsx`
  - [ ] `lib/machine-setup-service.js`
- [ ] Verify environment variables are set:
  - [ ] `NEXT_PUBLIC_GITHUB_ACCESS_TOKEN`
  - [ ] `GITHUB_ACCESS_TOKEN`
  - [ ] `NEXT_FLY_IO_TOKEN` (optional for now, needed for steps 2-4)
  - [ ] `FLY_IO_TOKEN` (optional for now, needed for steps 2-4)

## Phase 1: Database Setup

### 1.1 Deploy Migration

**Via Supabase Dashboard:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to SQL Editor
4. Create new query
5. Copy-paste entire contents of:
   ```
   supabase/migrations/add_incremental_machine_setup.sql
   ```
6. Click "Run" button
7. Wait for completion (should see green checkmark)

**Via Supabase CLI (if using):**
```bash
supabase migration up
```

### 1.2 Verify Table Creation

```sql
-- Run this in SQL Editor to verify
SELECT * FROM machine_setup_sessions LIMIT 1;
-- Should return: (no rows) and table exists
```

**Expected output:** Table exists but empty (no rows yet)

### 1.3 Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT relname, rowsecurity 
FROM pg_class 
WHERE relname = 'machine_setup_sessions';
-- Should show: (machine_setup_sessions, true)
```

**Expected output:** RLS is enabled (true)

## Phase 2: API Deployment

### 2.1 Verify API File Exists

```bash
ls -la app/api/machine-setup/route.js
```

**Expected output:** File exists and is 459 lines

### 2.2 Test API Locally

Start your dev server:
```bash
npm run dev
```

In browser console, test the endpoint:
```javascript
// Requires authentication token
const token = localStorage.getItem('auth_token'); // Adjust for your auth

fetch('/api/machine-setup?projectId=test&githubRepo=https://github.com/test/repo', {
  headers: {
    Authorization: `Bearer ${token}`,
  }
})
.then(r => r.json())
.then(console.log)
```

**Expected output:** 
```json
{
  "success": true,
  "session": {
    "id": "uuid...",
    "project_id": "test",
    "fly_app_name": "roseram-xxx",
    "preview_url": "https://roseram-xxx.fly.dev",
    ...
  },
  "isNew": true
}
```

## Phase 3: Component Deployment

### 3.1 Verify Component File

```bash
ls -la components/IncrementalMachineSetup.jsx
```

**Expected output:** File exists and is 456 lines

### 3.2 Add to Preview Panel

Find your preview component (likely one of these):
- `components/PreviewPanel.jsx`
- `components/FlyPreview.jsx`
- `components/UnifiedPreviewPanel.jsx`
- Or wherever previews are shown

Replace or add alongside existing preview:

```jsx
import { IncrementalMachineSetup } from "@/components/IncrementalMachineSetup";

export function PreviewPanel() {
  return (
    <IncrementalMachineSetup
      projectId={projectId}
      githubRepo={githubRepo}
      githubBranch={branch}
      onSetupComplete={(data) => {
        console.log("Setup complete!", data);
      }}
      onError={(error) => {
        console.error("Setup failed:", error);
      }}
    />
  );
}
```

### 3.3 Test Component Rendering

1. Start dev server: `npm run dev`
2. Navigate to preview section
3. Should see:
   - [ ] "Incremental Machine Setup" heading
   - [ ] Repository info box
   - [ ] 4 steps displayed
   - [ ] "Execute Step 1" button visible
   - [ ] Empty logs section

**Expected appearance:** Shows step-by-step setup UI (see `IncrementalMachineSetup.jsx` for design)

## Phase 4: End-to-End Testing

### 4.1 Test Step 1 (Repository Detection)

1. Click "Execute Step 1" button
2. Wait for execution (should take 2-3 seconds)
3. Should see:
   - [ ] Loading spinner while executing
   - [ ] Status changes to "completed"
   - [ ] Green checkmark appears
   - [ ] Results show in green box:
     - Repository name
     - Branch
     - Project type
   - [ ] Log entries appear:
     - "Executing Step 1: Repository Detection"
     - "✓ Step 1 completed successfully"
     - Repository detection details

**If this works:** Step 1 is fully functional ✅

**If this fails:**
- Check GitHub token is configured
- Check logs in browser console
- Check API logs in server output
- See `INCREMENTAL_MACHINE_SETUP_GUIDE.md` Troubleshooting section

### 4.2 Test Steps 2-4 (Placeholder)

1. Click "Continue to Next Step" after Step 1
2. Should see Step 2 UI
3. Click "Execute Step 2"
4. Should see:
   - [ ] "completed" status
   - [ ] Green checkmark
   - [ ] Results with placeholder data:
     - App name
     - Region
     - Machine size

**Note:** Steps 2-4 are currently stubs (placeholder logic). They'll succeed but don't actually provision machines. See `FLYIO_MACHINE_PROVISIONING_GUIDE.md` to implement real Fly.io integration.

### 4.3 Test Error Handling

1. Try with invalid repository:
   - Change `githubRepo` to `https://github.com/invalid/repo-that-does-not-exist`
2. Click "Execute Step 1"
3. Should see:
   - [ ] Error icon (red exclamation)
   - [ ] Status shows "error"
   - [ ] Error message displayed
   - [ ] Log shows error

**Expected:** Clear error message, graceful handling

### 4.4 Test Logs

1. Execute any step
2. Should see real-time log entries:
   - [ ] Timestamps for each entry
   - [ ] Different colored text for errors
   - [ ] "✓" checkmarks for successes
   - [ ] Clear, readable messages

## Phase 5: Documentation Review

### 5.1 Integration Guide

- [ ] Read `MACHINE_SETUP_INTEGRATION_GUIDE.md`
- [ ] Understand 3 integration approaches
- [ ] Plan which approach fits your app
- [ ] Review testing checklist in guide

### 5.2 Full System Guide

- [ ] Read `INCREMENTAL_MACHINE_SETUP_GUIDE.md`
- [ ] Understand 4-step process
- [ ] Review database schema
- [ ] Review API endpoint docs
- [ ] Understand user experience flow

### 5.3 Provisioning Guide (For Later)

- [ ] Read `FLYIO_MACHINE_PROVISIONING_GUIDE.md`
- [ ] Understand actual Fly.io API integration
- [ ] Review code examples for steps 2-4
- [ ] Plan Fly.io implementation when ready

## Phase 6: Production Deployment

### 6.1 Pre-Production

- [ ] All tests in Phase 4 pass
- [ ] No console errors
- [ ] All logs are clean and helpful
- [ ] Component renders properly
- [ ] API responds correctly

### 6.2 Staging

```bash
# Build for production
npm run build

# Should complete without errors
```

- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No warnings about missing dependencies

### 6.3 Production

1. **Merge to main branch**
   ```bash
   git add -A
   git commit -m "feat: add incremental machine setup system"
   git push origin main
   ```

2. **Deploy to production**
   - Via GitHub Actions (if configured)
   - Via Netlify (if deployed there)
   - Via manual deployment

3. **Verify in production**
   - [ ] Preview tab loads without errors
   - [ ] Components render correctly
   - [ ] API endpoints respond
   - [ ] Step 1 works end-to-end

4. **Monitor**
   - [ ] Check error logs
   - [ ] Monitor API response times
   - [ ] Collect user feedback
   - [ ] Track success/failure rates

## Phase 7: Fly.io Integration (Next Steps)

When ready to implement actual machine provisioning:

### 7.1 Prepare

- [ ] Install Fly.io SDK: `npm install @fly/sdk`
- [ ] Read `FLYIO_MACHINE_PROVISIONING_GUIDE.md`
- [ ] Get Fly.io organization ID
- [ ] Set environment variables:
  - [ ] `FLY_ORG_ID`
  - [ ] `NEXT_FLY_IO_TOKEN`

### 7.2 Implement

- [ ] Create `lib/flyio-client.js` (GraphQL client)
- [ ] Implement Step 2 (machine allocation)
- [ ] Implement Step 3 (settings configuration)
- [ ] Implement Step 4 (repository boot)
- [ ] Test with real repositories

### 7.3 Verify

- [ ] All 4 steps complete successfully
- [ ] Machines actually provision
- [ ] Preview URLs become live
- [ ] End-to-end flow works

## Common Issues & Solutions

### "Migration failed" 
- Check Supabase is accessible
- Verify SQL has no syntax errors
- Try running in smaller chunks
- Check for existing table conflicts

### "API 401 Unauthorized"
- Verify auth token is valid
- Check headers are correct
- Verify user session is active
- Check RLS policies

### "Component doesn't load"
- Check import path is correct
- Verify dependencies installed
- Check browser console for errors
- Verify component file exists

### "Step 1 fails - repository not found"
- Verify GitHub token is set
- Verify repository exists and is public
- Verify URL format: `https://github.com/owner/repo`
- Check GitHub token has correct permissions

### "Steps 2-4 are stubs"
- This is expected! They have placeholder logic
- Use `FLYIO_MACHINE_PROVISIONING_GUIDE.md` to implement
- Or wait until ready to provision real machines

## Success Criteria

You'll know everything is working when:

1. ✅ Database migration runs without errors
2. ✅ API endpoint returns success on GET request
3. ✅ Component renders in your preview panel
4. ✅ Step 1 executes and shows repository info
5. ✅ Steps 2-4 complete with placeholder data
6. ✅ Logs show real-time updates
7. ✅ Errors are handled gracefully
8. ✅ Component is usable and clear

## Timeline

| Phase | Estimated Time | Status |
|-------|-----------------|--------|
| 1. Database | 5 min | ✅ Ready |
| 2. API | 2 min | ✅ Ready |
| 3. Component | 10 min | ✅ Ready |
| 4. Testing | 15 min | ✅ Ready |
| 5. Review | 20 min | ✅ Ready |
| 6. Production | 10 min | ✅ Ready |
| 7. Fly.io Integration | 2-4 hours | 🚧 When ready |

**Total for basic deployment:** ~60 minutes
**Total with Fly.io integration:** ~2.5-4 hours

## Getting Help

### Documentation
- `IMPLEMENTATION_SUMMARY.md` - What was built
- `INCREMENTAL_MACHINE_SETUP_GUIDE.md` - How system works
- `MACHINE_SETUP_INTEGRATION_GUIDE.md` - How to integrate
- `FLYIO_MACHINE_PROVISIONING_GUIDE.md` - How to provision

### Code
- `app/api/machine-setup/route.js` - API implementation
- `components/IncrementalMachineSetup.jsx` - Component code
- `lib/machine-setup-service.js` - Service functions
- `supabase/migrations/add_incremental_machine_setup.sql` - Database

### Resources
- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Fly.io Docs](https://fly.io/docs/)

## Feedback

As you deploy and test, note:
- What works well
- What's confusing
- What needs improvement
- Suggestions for enhancements

This will help refine the system for other users.

---

**Ready to deploy?** Start with Phase 1: Database Setup. ✅
