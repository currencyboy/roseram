# Sprites Preview Database Setup

If your preview is stuck on "Starting Sprites sandbox...", the database table might not be set up.

## Quick Fix

1. **Go to Supabase Console**
   - Visit: https://supabase.com/dashboard/projects
   - Select your project (berjjbyhpxnarpjgvkhq)

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Setup Script**
   - Open the file: `scripts/setup-auto-preview-schema.sql`
   - Copy all the SQL code
   - Paste it into Supabase SQL Editor
   - Click "Run"

4. **Verify Setup**
   - The table `auto_preview_instances` should now exist
   - You should see columns: id, project_id, user_id, sprite_name, status, etc.

5. **Try Preview Again**
   - Go back to your preview
   - Refresh the page (click [Refresh Preview](#browser-refresh))
   - The preview should now load

## What Gets Created

The setup script creates:
- ✅ `auto_preview_instances` table (stores sprite information)
- ✅ RLS policies (security)
- ✅ Indexes for fast queries

## If Still Stuck

**Check the logs:**
1. Press F12 to open browser DevTools
2. Click "Console" tab
3. Look for messages from `[QuickPreview]`
4. Copy any error messages

**Common errors:**
- `"Sprites is not configured"` → SPRITES_TOKEN not set
- `"User not found in Supabase auth"` → Sign in again
- `"Failed to create sprite"` → Database table missing (run SQL setup)

## Reference

- **Database setup**: `scripts/setup-auto-preview-schema.sql`
- **Verification**: `scripts/verify-auto-preview-schema.sql`
- **Environment**: SPRITES_TOKEN must be configured
