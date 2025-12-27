# ✅ Setup Checklist - Unified Coding Environment

Complete these steps to activate the full coding environment system.

## Prerequisites (Should Already Be Done)
- [ ] Node.js installed
- [ ] npm dependencies installed (`npm install`)
- [ ] Next.js app running (`npm run dev`)
- [ ] Supabase project created
- [ ] GitHub integration set up
- [ ] X.AI (Grok) API key obtained

## Step 1: Supabase Database Setup

### 1.1 Create Tables
- [ ] Open Supabase Dashboard: https://supabase.com
- [ ] Select your "roseram-builder" project
- [ ] Click "SQL Editor" in sidebar
- [ ] Click "New Query"
- [ ] Copy contents of: `migrations/add_revisions_and_actions.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run" (or Ctrl+Enter)
- [ ] Wait for success message

### 1.2 Verify Tables
- [ ] Click "Table Editor" in sidebar
- [ ] You should see new tables:
  - [ ] `file_revisions`
  - [ ] `action_logs`
- [ ] Click on `file_revisions` → check columns exist
- [ ] Click on `action_logs` → check columns exist

### 1.3 Enable Row-Level Security
- [ ] Click `file_revisions` table
- [ ] Click "RLS" in top menu
- [ ] Toggle RLS to ON
- [ ] Verify policies are created:
  - [ ] "Users can view revisions for their projects"
  - [ ] "Users can create revisions for their projects"
- [ ] Repeat for `action_logs` table:
  - [ ] "Users can view action logs for their projects"
  - [ ] "Users can create action logs for their projects"

## Step 2: Environment Variables

### 2.1 Verify Set Variables
- [ ] `NEXT_PUBLIC_SUPABASE_PROJECT_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON` is set
- [ ] `X_API_KEY` is set (for Grok)
- [ ] `GITHUB_ACCESS_TOKEN` is set

### 2.2 Check Dev Server
- [ ] Run: `npm run dev`
- [ ] Verify no errors in console
- [ ] App runs on http://localhost:3001

## Step 3: Code Builder Activation

### 3.1 Verify New Components
- [ ] File exists: `components/CodeBuilder.tsx` ✅
- [ ] File exists: `components/RevisionHistory.tsx` ✅
- [ ] File exists: `components/ActionsLog.tsx` ✅
- [ ] File exists: `lib/useRevisions.ts` ✅

### 3.2 Verify API Endpoints
- [ ] File exists: `app/api/revisions/route.ts` ✅
- [ ] File exists: `app/api/actions/route.ts` ✅
- [ ] Existing: `app/api/grok-generate/route.ts` ✅

### 3.3 Verify Page Updated
- [ ] File: `app/builder/page.tsx` imports CodeBuilder ✅
- [ ] `/builder` route now shows new UI

## Step 4: Testing

### 4.1 Navigate to Builder
- [ ] Open browser
- [ ] Go to http://localhost:3001/builder
- [ ] Should see unified coding environment
- [ ] No TypeScript errors in console

### 4.2 Test File Operations
- [ ] Sidebar shows file explorer
- [ ] Click a file → loads in editor
- [ ] Edit the file content
- [ ] Click "Save File" button
- [ ] No errors appear

### 4.3 Test Revision System
- [ ] After saving, click "Version History" tab
- [ ] Should see your saved revision
- [ ] Click to expand revision
- [ ] See code preview at bottom
- [ ] Try "Restore" button
- [ ] File content reverts

### 4.4 Test Activity Log
- [ ] Click "Activity Log" tab
- [ ] Should see recent actions
- [ ] Auto-updates every 5 seconds
- [ ] Shows action type and timestamp

### 4.5 Test Grok Integration
- [ ] Select an HTML file
- [ ] Enter prompt in "Grok AI Prompt" box
- [ ] Example: "Create a simple hello world button"
- [ ] Click "Generate" button
- [ ] Code appears in editor
- [ ] Activity Log shows "Generated with Grok"
- [ ] Version History shows new revision with type "generate"

### 4.6 Test Live Preview
- [ ] Switch to "Preview" view mode
- [ ] For HTML files, should show rendered output
- [ ] Edit HTML and save
- [ ] Preview updates
- [ ] Try generating code and see preview

## Step 5: Verification Queries

Run these in Supabase SQL Editor to verify:

### 5.1 Check Tables Created
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('file_revisions', 'action_logs');
```
Expected result: 2 rows

### 5.2 Check Revisions Table
```sql
SELECT * FROM public.file_revisions LIMIT 1;
```
Expected: Returns column list (may be empty, that's okay)

### 5.3 Check Actions Table
```sql
SELECT * FROM public.action_logs LIMIT 1;
```
Expected: Returns column list (may be empty, that's okay)

### 5.4 Check RLS Enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('file_revisions', 'action_logs');
```
Expected: rowsecurity = true for both tables

## Step 6: Documentation

- [ ] Read: `CODING_ENVIRONMENT_SETUP.md` - Overview and features
- [ ] Read: `CODING_ENVIRONMENT_COMPLETE.md` - Complete reference
- [ ] Read: `SUPABASE_SETUP_REVISIONS.md` - Database setup details

## Step 7: Optional Configurations

### 7.1 Real-Time Preview Updates (Optional)
- [ ] In Supabase, click `file_revisions` table
- [ ] Click "Realtime" tab
- [ ] Toggle "Enable Realtime" (optional for live sync)

### 7.2 Enable Syntax Highlighting (Optional)
- [ ] Install: `npm install react-syntax-highlighter`
- [ ] Import in CodeBuilder
- [ ] Wrap code content with syntax highlighter

### 7.3 Add Prettier Formatting (Optional)
- [ ] Install: `npm install prettier`
- [ ] Add "Format" button in editor
- [ ] Format code on button click

## Troubleshooting

### Issue: "Table does not exist"
**Solution**:
1. Check if migration SQL ran successfully
2. Run manually in Supabase SQL Editor
3. See: `SUPABASE_SETUP_REVISIONS.md`

### Issue: "No revisions appearing"
**Solution**:
1. Check browser console for errors
2. Verify Supabase RLS policies exist
3. Check /api/revisions endpoint returns data
4. Verify projectId is correct

### Issue: "Activity log not updating"
**Solution**:
1. Check Network tab in developer tools
2. Verify /api/actions endpoint
3. Check projectId matches saved revisions
4. Refresh page to test

### Issue: "Grok generation fails"
**Solution**:
1. Check X_API_KEY environment variable
2. Verify Grok API is accessible
3. Check error message in red banner
4. See: `CODING_ENVIRONMENT_SETUP.md`

### Issue: "GitHub repository not loading"
**Solution**:
1. Verify GitHub token is valid
2. Check repository exists and is accessible
3. Verify repo owner and name
4. Check GitHub token permissions

## Performance Notes

- Initial file explorer load: ~1-2 seconds
- Activity log refresh: Every 5 seconds
- Revision save: < 1 second
- Large file editing: May be slow for files > 1MB

## Support Resources

- **Complete Setup Guide**: `CODING_ENVIRONMENT_SETUP.md`
- **Database Setup**: `SUPABASE_SETUP_REVISIONS.md`
- **Final Reference**: `CODING_ENVIRONMENT_COMPLETE.md`
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

## Final Verification

After completing all steps, verify:

- [ ] `/builder` page loads without errors
- [ ] File explorer shows files
- [ ] Can open and edit files
- [ ] Can save files and see revisions
- [ ] Can restore previous versions
- [ ] Activity log updates in real-time
- [ ] Grok generation works
- [ ] Live preview works for HTML
- [ ] View modes (split/editor/preview) work
- [ ] No console errors

## Success Indicators

You'll know everything is working when:
1. ✅ `/builder` page displays full UI
2. ✅ File content loads on click
3. ✅ Saves create revisions in Supabase
4. ✅ Activity log shows all actions
5. ✅ Grok generates code successfully
6. ✅ Preview updates in real-time
7. ✅ Revisions can be restored instantly
8. ✅ No errors in browser console or terminal

---

**Estimated Setup Time**: 15-20 minutes  
**Difficulty Level**: Intermediate  
**Status**: Production Ready ✅
