# Supabase Environment Variables Setup

## Current Issue
The app is currently using placeholder Supabase credentials:
- URL: `https://placeholder.supabase.co`
- Key: `placeholder-key`

This is why authentication is failing with "Supabase is not properly configured."

## Required Environment Variables

You need to set the following environment variables. Choose ONE of these naming conventions:

### Option 1: NEXT_PUBLIC_ Prefix (Recommended for Next.js)
```
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Option 2: Alternative NEXT_PUBLIC_ Names
```
NEXT_PUBLIC_SUPABASE_PROJECT_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON=<your-anon-key>
```

## How to Get Your Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select or create a project
3. Go to **Settings > API**
4. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## How to Set Environment Variables in Builder.io

1. Click [Open Settings](#open-settings) (top right)
2. Find the environment variables section
3. Add the variables:
   - Key: `NEXT_PUBLIC_SUPABASE_URL` | Value: `https://your-project.supabase.co`
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Value: `your-anon-key-here`
4. Save and the dev server will automatically reload

## Verification

After setting the variables:
1. Open the browser developer console (F12)
2. Look for `[Supabase Config]` log message
3. It should show:
   - `hasUrl: true`
   - `hasKey: true`
   - `isPlaceholder: false`
   - `urlType: REAL`

## Need Help?

- **Don't have a Supabase project?** [Connect to Supabase](#open-mcp-popover) to create one
- **Still getting errors?** Check that:
  - Variables start with `NEXT_PUBLIC_`
  - No extra spaces or quotes
  - Dev server has reloaded after setting variables
