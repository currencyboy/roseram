# Quick Setup: Enable Sprites Preview (Auto-Preview)

## Problem
Your Sprites preview is failing with: **"Failed to create sprite record"**

This means the database table hasn't been created yet.

## Solution (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **berjjbyhpxnarpjgvkhq**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run the Setup SQL
1. Open `scripts/setup-auto-preview-schema.sql` from your project
2. Copy the entire SQL content
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** button

![Supabase SQL Editor screenshot]

### Step 3: Verify Setup
After running, you should see:
```
Query executed successfully
```

Check that the table exists:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'auto_preview_instances';
```

This should return one row with `auto_preview_instances`.

### Step 4: Test Sprites Preview
1. Go back to your app
2. Try to start a Sprites preview
3. It should now work! ✅

## What Was Set Up

The SQL creates:
- ✅ `auto_preview_instances` table (stores preview sessions)
- ✅ Proper indexes for performance
- ✅ Row Level Security (users can only see their own previews)
- ✅ Timestamp tracking (created_at, updated_at)
- ✅ Auto-update trigger (updated_at automatically updates)

## If You Still Get Errors

### Error: "does not exist"
- Make sure you ran the SQL from `scripts/setup-auto-preview-schema.sql`
- Check that the table appears in your Supabase Tables list

### Error: "Failed to create sprite record" (after setup)
- Refresh your browser (clear cache)
- Check Supabase RLS policies are created (they are in the SQL)
- Verify you're logged in with a user that exists in auth.users

### Can't find SQL Editor
- Supabase Dashboard → Your Project → SQL Editor (left sidebar)
- If not visible, your account may not have SQL access (contact support)

## Verify Everything Works

Once setup is complete, you can test with:

```bash
# Option 1: Use the web interface
# Go to your preview page and click "Start Sprites Preview"

# Option 2: Test the API directly (in browser console)
fetch('/api/sprites-preview?repo=owner/repo&branch=main', {
  headers: {
    'Authorization': `Bearer YOUR_TOKEN_HERE`
  }
}).then(r => r.json()).then(d => console.log(d));
```

If you get:
```json
{
  "success": true,
  "sprite": { "id": "...", "status": "provisioning" }
}
```

Then it's working! ✅

## Manual SQL If Needed

If you can't run the full SQL, here's the minimum:

```sql
CREATE TABLE IF NOT EXISTS public.auto_preview_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  sprite_name TEXT,
  port INTEGER,
  preview_url TEXT,
  status TEXT DEFAULT 'initializing',
  package_manager TEXT DEFAULT 'npm',
  script_name TEXT DEFAULT 'dev',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  github_repo_url TEXT,
  github_branch TEXT
);

ALTER TABLE public.auto_preview_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own previews" ON public.auto_preview_instances
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create previews" ON public.auto_preview_instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Need Help?

Check:
- `SPRITES_DEV_SETUP_GUIDE.md` - Full Sprites.dev reference
- `PREVIEW_SYSTEMS_COMPARISON.md` - Compare Sprites vs Fly.io
- Issue: Table already exists? Just run the policies update part:

```sql
DROP POLICY IF EXISTS "Users can view own previews" ON public.auto_preview_instances;
DROP POLICY IF EXISTS "Users can create previews" ON public.auto_preview_instances;
DROP POLICY IF EXISTS "Users can update own previews" ON public.auto_preview_instances;
DROP POLICY IF EXISTS "Users can delete own previews" ON public.auto_preview_instances;

CREATE POLICY "Users can view own previews" ON public.auto_preview_instances
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create previews" ON public.auto_preview_instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own previews" ON public.auto_preview_instances
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own previews" ON public.auto_preview_instances
  FOR DELETE USING (auth.uid() = user_id);
```

---

**Once done:** Your Sprites preview system will work perfectly! 🚀
