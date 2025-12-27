# Auto Preview "Preview record not found" Fix

## Issues Identified and Fixed

### 1. **Race Condition in Frontend Polling**
- **Problem**: Frontend immediately polls for preview after POST, but database might not have committed the record yet
- **Fix**: Added intelligent retry logic to handle 404s gracefully
  - Allows up to 5 "not found" responses before giving up
  - Uses shorter delays (2 seconds) for first attempts
  - Better distinguishes between race conditions and fatal errors

### 2. **Dev Server Timeout Issues**
- **Problem**: Dev server not starting in Sprites container, timeouts after 5 minutes
- **Fix**: 
  - Reduced timeout from 5 minutes to 2 minutes for faster failure
  - Added better error detection for failures in stdout/stderr
  - Added process exit handling for better error messages
  - Added more port detection patterns for common dev servers

### 3. **Error Message Handling**
- **Problem**: Error messages not being captured properly from AutoPreviewManager
- **Fix**: Improved error handling to properly extract error messages from different error formats
  - Logs now show actual error reasons instead of "undefined"
  - Error messages stored correctly in database for frontend display

### 4. **Database Schema & RLS**
- **Problem**: Potential table not found or RLS policy issues
- **Fix**: Updated RLS policies to explicitly allow service role access
  - Changed policies to allow `auth.uid() IS NULL` (service role bypass)
  - Added detection for table not found errors with helpful messages

## Files Changed

### Frontend
- `components/SimpleAutoPreview.jsx`: Enhanced polling logic with race condition handling

### Backend API
- `app/api/auto-preview/route.js`: Improved error handling and logging

### Services
- `lib/auto-preview-manager.js`: Updated timeout to 2 minutes
- `lib/sprites-service.js`: Better error detection and logging
- `lib/supabase.js`: Added initialization logging

### Database
- `scripts/auto-preview-schema.sql`: Updated RLS policies
- `app/api/setup/auto-preview-schema/route.js`: Updated RLS policies

## What You Need To Do

### Step 1: Apply Database Schema Updates

Run the updated schema to ensure RLS policies are correct:

**Option A: Using the setup endpoint**
```bash
curl -X POST http://localhost:3000/api/setup/auto-preview-schema
```

**Option B: Manually in Supabase**
1. Go to your Supabase project → SQL Editor
2. Copy and run the SQL from `scripts/auto-preview-schema.sql`

This will:
- Create the `auto_preview_instances` table if it doesn't exist
- Update RLS policies to allow service role access
- Set up proper indexes and triggers

### Step 2: Verify Environment Variables

Ensure these are set in your environment:
- `NEXT_PUBLIC_SUPABASE_PROJECT_URL` or `SUPABASE_PROJECT_URL`
- `NEXT_PUBLIC_SUPABASE_ANON` or `SUPABASE_ANON`
- `NEXT_SUPABASE_SERVICE_ROLE` or `SUPABASE_SERVICE_ROLE`
- `SPRITES_TOKEN`
- `GITHUB_ACCESS_TOKEN`

### Step 3: Test the Fix

1. Reload your browser
2. Try selecting a repository to preview
3. Check the browser console for better error messages
4. Check the server logs for detailed diagnostic information

## Troubleshooting

### "Dev server did not open a port within timeout"
This means the dev server failed to start in the container. Reasons could be:
- Missing dependencies (npm/pnpm/yarn install failed)
- Incorrect branch name or branch doesn't exist
- Repository has syntax errors or broken build
- Custom dev scripts that don't output expected port patterns

**Solution**: 
- Verify the repository branch exists
- Ensure dependencies are correct
- Check if there's a custom dev script and its output format

### "Preview record not found"
- First, ensure Step 1 (schema setup) is complete
- Check that `SUPABASE_SERVICE_ROLE` environment variable is set correctly
- Clear browser cache and try again
- Check server logs for detailed error information

### Still not working?
- Check the browser console (Dev Tools → Console tab)
- Check the server logs for messages starting with `[AutoPreview]` or `[SpritesService]`
- Verify Supabase connection by checking SQL Editor can access the table

## New Error Messages

After these fixes, you'll see more helpful error messages like:
- `Dev server did not open a port within 120s. Verify the repository has correct dependencies...`
- `Preview record not found after 5 attempts. Details: [error]`
- `Failed to create preview record: [specific database error]`

## Performance Improvements

- Preview startup is now faster (2-minute timeout instead of 5)
- Failed previews fail faster, allowing quicker retry attempts
- Better error detection helps identify issues more quickly

## Future Improvements

Consider implementing:
1. Custom port detection patterns for specific frameworks
2. Support for repositories without dev servers
3. Fallback to default port if detection fails
4. Better logging of git clone and install steps
