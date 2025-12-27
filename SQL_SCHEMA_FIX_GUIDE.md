# SQL Schema Fix Guide

## Problem
Your database is missing the `slug` column on the `sites` and `pages` tables, causing errors like:
```
ERROR: 42703: column "slug" does not exist
```

## Root Cause
The database schema hasn't been fully initialized with all required tables and columns. The application code expects:
- `organizations` table with `slug` column
- `sites` table with `slug` column
- `pages` table with `slug` column
- Many other supporting tables for the full application

## Solution
I've created two automated scripts to rebuild your entire database schema:

### Option 1: Using NPM (Recommended)
```bash
npm run db:rebuild
```

Or the alias:
```bash
npm run db:fix-slug
```

### Option 2: Using Bash Script
```bash
bash scripts/fix-schema.sh
```

### Option 3: Manual Script Execution
If you want to run the Node.js script directly:
```bash
node scripts/schema-rebuild.js
```

## What the Scripts Do

The rebuild process:
1. ✓ Creates all necessary tables (organizations, sites, pages, projects, etc.)
2. ✓ Adds the missing `slug` columns with proper constraints
3. ✓ Sets up foreign key relationships
4. ✓ Creates performance indexes
5. ✓ Enables Row Level Security (RLS) policies
6. ✓ Optimizes database performance

## Required Environment Variables

The scripts need these environment variables to be set:

**From `NEXT_PUBLIC_*` or without prefix:**
- `NEXT_PUBLIC_SUPABASE_PROJECT_URL` OR `SUPABASE_PROJECT_URL`
- `NEXT_SUPABASE_SERVICE_ROLE` OR `SUPABASE_SERVICE_ROLE`

These are automatically loaded from:
1. `.env.local` (highest priority)
2. `.env` files
3. System environment variables

## Step-by-Step Instructions

### 1. Make Sure Environment Variables are Set
Check your `.env.local` file has:
```
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://your-project.supabase.co
NEXT_SUPABASE_SERVICE_ROLE=your-service-role-key
```

### 2. Run the Fix
```bash
npm run db:rebuild
```

### 3. Wait for Completion
The script will:
- Connect to your Supabase instance
- Execute the full schema rebuild
- Verify all tables were created successfully
- Show a completion message

### 4. Restart Your Dev Server
If your development server is running, restart it:
```bash
npm run dev
```

### 5. Test
Try creating a site or page in your application. The `slug` error should now be resolved.

## What Gets Created

### Core Tables:
- `organizations` - Organization management with slugs and plans
- `organization_members` - Team members with roles
- `projects` - Developer projects
- `sites` - Sites builder projects
- `pages` - Individual pages within sites
- `deployments` - Deployment tracking (Netlify, Vercel, etc.)
- `components` - Reusable components library
- `sections` - Reusable sections library

### Feature Tables:
- `chat_messages` - AI chat/conversations
- `ai_generations` - AI generation tracking
- `ai_conversations` - Conversation history
- `code_versions` - Code version tracking
- `file_snapshots` - File backups
- `file_revisions` - File version history

### Billing & Analytics:
- `user_ai_usage` - API usage tracking
- `api_usage_logs` - Detailed API logs
- `solana_payments` - Crypto payment tracking
- `invoices` - Invoice management
- `usage_quotas` - Plan limits
- `activity_logs` - Audit trail
- `error_logs` - Error tracking
- `page_analytics` - Page statistics

### Configuration:
- `user_settings` - User preferences
- `user_sessions` - Session data
- `user_integrations` - OAuth integrations
- `integrations` - Organization integrations

## Troubleshooting

### "Missing Supabase credentials"
Make sure your `.env.local` file has the correct Supabase credentials:
```bash
# Get from: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://your-project.supabase.co
NEXT_SUPABASE_SERVICE_ROLE=your-service-role-key
```

### "Connection test failed"
- Verify the Supabase project URL is correct
- Check the service role key is valid
- Ensure your Supabase project is active

### "Schema rebuild failed"
- Check your internet connection
- Verify Supabase credentials are correct
- Check if your Supabase project has quota available
- Try again in a few minutes

### Still getting "column slug does not exist"
- Make sure the script completed without errors
- Restart your development server: `npm run dev`
- Clear your browser cache
- Check Supabase dashboard to confirm tables were created

## Database Integrity

The rebuild process:
- Uses `CREATE TABLE IF NOT EXISTS` - existing tables won't be deleted
- Preserves all existing data in existing tables
- Only adds missing tables and columns
- Maintains referential integrity with foreign keys
- Applies proper constraints for data validation

## Support

If you encounter issues:

1. Check the error message from the script
2. Review the environment variables are set correctly
3. Verify Supabase project is accessible
4. Check Supabase dashboard for any quota issues
5. Try running the script again

## Files Created

- `scripts/schema-rebuild.js` - Main Node.js rebuild script
- `scripts/fix-schema.sh` - Bash wrapper script
- `SQL_SCHEMA_FIX_GUIDE.md` - This guide

## Related Documentation

- [Database Architecture](./SYSTEM_ARCHITECTURE.md)
- [Supabase Setup](./SUPABASE_SETUP_REVISIONS.md)
- [Schema Overview](./SUPABASE_SCHEMA.md)
