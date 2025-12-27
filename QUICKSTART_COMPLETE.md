# Roseram Builder - Complete Quick Start Guide

## 5-Minute Setup

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Create .env.local with your credentials:
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=eyJhbGc...your-anon-key...
NEXT_PUBLIC_X_API_KEY=xai_...your-grok-api-key...
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=ghp_...your-github-token...
NEXT_PUBLIC_NETLIFY_ACCESS_TOKEN=nfp_...optional...
NEXT_PUBLIC_NETLIFY_SITE_ID=...optional...
```

### 2. Database Setup
```bash
# In Supabase Dashboard:
# 1. Open SQL Editor
# 2. Create new query
# 3. Copy contents of: scripts/create-actions-schema.sql
# 4. Run the query
```

### 3. Start Development Server
```bash
npm run dev
# Visit http://localhost:3001
```

## User Flow

### First Time User
```
1. Visit http://localhost:3001
2. Click "Go to Setup"
3. Enter GitHub Personal Access Token
   - Get token: https://github.com/settings/tokens
   - Scopes: repo, read:user
4. Select a GitHub repository
5. Continue to Builder
```

### In the Builder
```
1. File Explorer (left)
   - Click any file to view its contents
   - Explore your repository structure

2. Code Viewer (top right)
   - Shows current file content
   - Read-only (generated code shown here)

3. Code Generator Chat (bottom left)
   - Type: "Create a React button component"
   - Click Generate or press Enter
   - Code appears in viewer above
   - Code history shown on the right

4. Action History (bottom right)
   - See all code generations
   - Click any past action to view its code
   - Click ↩️ to undo that specific action
   - Click 🗑️ to rollback to before that action
```

## Common Tasks

### Generate Code
```
1. Select a file in the explorer
2. Type a prompt: "Create a login form in TypeScript"
3. Click "Generate"
4. Review generated code in the viewer
5. Code is automatically tracked in history
```

### Undo a Generation
```
1. Look at Action History (bottom right)
2. Find the generation you want to undo
3. Click the ↩️ (undo) button
4. Code reverts to previous state
```

### Rollback Everything
```
1. In Action History, click 🗑️ on an older action
2. All changes after that point are undone
3. Files revert to that snapshot
4. Check "Reset All Changes" to go to the very beginning
```

### Switch Files
```
1. Click different file in the explorer
2. Code viewer updates automatically
3. Generate code for the new file
4. Each file's changes are tracked separately
```

## Troubleshooting

### "Loading files..." stuck
**Cause**: GitHub token not initialized
**Fix**: 
```
1. Check NEXT_PUBLIC_GITHUB_ACCESS_TOKEN is set
2. Restart dev server
3. Go to Setup and re-authenticate
```

### "No Repository Selected"
**Cause**: Need to select a GitHub repository
**Fix**:
```
1. Click "Go to Setup" button
2. Enter GitHub token
3. Select a repository
4. Continue to Builder
```

### Code generation returns empty
**Cause**: Grok API key missing or invalid
**Fix**:
```
1. Check NEXT_PUBLIC_X_API_KEY environment variable
2. Verify key is valid at https://console.x.ai/
3. Check browser console for API errors
```

### History not showing actions
**Cause**: Database schema not created
**Fix**:
```
1. Go to Supabase SQL Editor
2. Run: scripts/create-actions-schema.sql
3. Verify tables exist:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
```

### "Permission denied" errors
**Cause**: RLS policies not allowing access
**Fix**:
```
1. Ensure you're logged in (top left shows email)
2. Check Supabase RLS policies are enabled
3. Verify user_id matches authenticated user
4. Check database logs for violations
```

### Authentication not working
**Cause**: Supabase not configured
**Fix**:
```
1. Verify NEXT_PUBLIC_SUPABASE_PROJECT_URL is correct
2. Check NEXT_PUBLIC_SUPABASE_ANON key is valid
3. Ensure Supabase Auth is enabled
4. Try logging out and back in
```

## Development Tips

### Enable Debug Logging
```typescript
// In components, use console.log with prefixes
console.log("[ComponentName] Action taken", data)

// Server-side, check terminal output
npm run dev
```

### Test API Endpoints
```bash
# Test Grok generation
curl -X POST http://localhost:3001/api/grok-generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a button"}'

# Test Actions API (requires auth token)
curl -X POST http://localhost:3001/api/actions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action":"getHistory","projectId":"test"}'
```

### Inspect Database
```sql
-- Check actions
SELECT * FROM actions WHERE project_id = 'your-project-id';

-- Check code versions
SELECT file_path, code_content FROM code_versions LIMIT 5;

-- Check snapshots
SELECT snapshot_index, created_at FROM history_snapshots;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('actions', 'code_versions', 'history_snapshots');
```

### Monitor Performance
```typescript
// Add timing to API calls
const start = performance.now();
const response = await fetch(url);
const end = performance.now();
console.log(`API call took ${end - start}ms`);
```

## Features Overview

### ✅ Code Generation
- Grok xAI integration
- Context-aware prompts
- Language detection from filename
- Non-blocking (shows loading state)

### ✅ Action Tracking
- Records all code generations
- Stores code snapshots
- Timestamps each action
- Metadata includes prompts and models

### ✅ Individual Revert
- Click to undo specific generation
- Restores code to before that action
- Creates revert action (audit trail)

### ✅ Full Rollback
- Jump back to any previous state
- Restores all files at once
- Snapshots enable fast rollback

### ✅ History Panel
- Chronological list of actions
- Click to expand and preview code
- Search and filter (future)

### ✅ Real-time Display
- Code appears instantly
- No streaming delay
- Syntax highlighting ready

## Next Steps

### To Deploy
```bash
# Build for production
npm run build

# Test production build
npm run start

# Deploy to Netlify/Vercel
# Push to GitHub and enable auto-deploy
```

### To Extend
- Add file editing (currently read-only)
- Support multiple languages
- Enable GitHub push (save back to repo)
- Add team collaboration
- Integrate more AI models

### To Monitor
- Set up error tracking (Sentry)
- Enable analytics (Mixpanel)
- Monitor API usage (Grok quota)
- Track database performance

## Support

### Resources
- [Supabase Docs](https://supabase.com/docs)
- [Grok API Docs](https://console.x.ai/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [GitHub API Docs](https://docs.github.com/en/rest)

### Documentation
- `ARCHITECTURE_COMPLETE.md` - Full architecture
- `SETUP_ACTION_HISTORY.md` - Action history setup
- `README.md` - General project info

### Getting Help
1. Check browser console for errors
2. Check terminal for server logs
3. Review documentation files
4. Check database tables for issues
5. Verify environment variables

## That's It! 🚀

You now have a fully functional code generation and version control system. Start generating code, explore your repositories, and build amazing things!
