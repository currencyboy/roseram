# Complete Schema Migration Execution Guide

## 📋 Overview

This migration comprehensively rebuilds your Supabase database with:
- ✅ All 23 essential tables (unused tables removed)
- ✅ All necessary columns for active features
- ✅ Proper constraints, defaults, and validations
- ✅ Performance-optimized indexes
- ✅ Row-Level Security (RLS) policies
- ✅ Helper views for common queries
- ✅ Complete audit trail and logging

**Location**: `scripts/complete-schema-migration.sql`

---

## ⚠️ CRITICAL: BACKUP YOUR DATABASE FIRST

**This migration will delete all existing data and rebuild from scratch.**

### Backup Steps:
1. Go to https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/settings/backups
2. Click **"Create a new backup"**
3. Wait for backup to complete (green checkmark)
4. **Note the backup ID** (save it somewhere safe)

**Estimated backup time**: 2-5 minutes

---

## 🚀 Execution Methods

### METHOD 1: Supabase Dashboard (Recommended for safety)

**Best for**: First-time execution, safety verification

#### Step 1: Verify Backup is Complete
- Backup status should show **"Completed"** (green)
- Do NOT proceed without successful backup

#### Step 2: Open SQL Editor
- Go to: https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/sql
- Click **"New Query"** (blue button, top-left)

#### Step 3: Copy Migration SQL
```bash
# Option A: Copy from your local file
# Open scripts/complete-schema-migration.sql in your editor
# Select all (Ctrl+A / Cmd+A)
# Copy (Ctrl+C / Cmd+C)

# Option B: View the file in your project
# The file is at: scripts/complete-schema-migration.sql
```

#### Step 4: Paste into SQL Editor
1. Click in the SQL editor area
2. Paste the entire migration SQL
3. Review the statements
4. Verify you can see "BEGIN;" at top and "COMMIT;" at bottom

#### Step 5: Execute
1. Click the **"RUN"** button (big blue play button)
2. Watch for status updates
3. Wait for "Success" message

**Expected execution time**: 30-60 seconds

---

### METHOD 2: Split Execution (For large transactions)

If the full migration times out, execute in phases:

#### Phase 1: Drop Old Tables
```sql
DROP TABLE IF EXISTS public.page_comments CASCADE;
DROP TABLE IF EXISTS public.page_analytics CASCADE;
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.usage_quotas CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.ai_generations CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.components CASCADE;
DROP TABLE IF EXISTS public.page_versions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
```

**Run this, wait for completion, then proceed to Phase 2**

#### Phase 2: Create Core Tables (copy sections from complete-schema-migration.sql)
Execute "PHASE 2: CREATE CORE TABLES" section

#### Continue for Remaining Phases
Follow the numbered phases in the migration file

---

### METHOD 3: Using CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Authenticate
supabase login

# Link to your project
supabase link --project-ref berjjbyhpxnarpjgvkhq

# Execute migration
supabase db push scripts/complete-schema-migration.sql
```

---

### METHOD 4: Using Node.js Script (Automated)

Create `scripts/run-migration.js`:

```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
const SUPABASE_SERVICE_ROLE = process.env.NEXT_SUPABASE_SERVICE_ROLE;

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

async function runMigration() {
  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SUPABASE_SERVICE_ROLE,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    const sqlFile = path.join(__dirname, 'complete-schema-migration.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    console.log('⏳ Executing migration...\n');
    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');
    
    // Verify
    const result = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`📊 Total tables: ${result.rows[0].table_count}`);
    console.log('✓ Database is ready!\n');

    await client.end();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

runMigration();
```

Then run:
```bash
node scripts/run-migration.js
```

---

## ✅ Verification Checklist

After executing the migration:

### 1. Check Tables in Supabase
```
https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/editor
```

**You should see exactly 23 tables:**
- [ ] organizations
- [ ] organization_members
- [ ] projects
- [ ] user_preferences
- [ ] user_sessions
- [ ] file_revisions
- [ ] file_snapshots
- [ ] code_versions
- [ ] history_snapshots
- [ ] chat_messages
- [ ] sites
- [ ] pages
- [ ] deployments
- [ ] action_logs
- [ ] activity_logs
- [ ] actions
- [ ] integrations
- [ ] user_integrations
- [ ] user_env_vars
- [ ] user_ai_usage
- [ ] api_usage_logs
- [ ] solana_payments
- [ ] invoices

### 2. Verify Key Columns Exist
Run these queries in SQL editor to verify:

```sql
-- Check organizations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- Check user_sessions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

-- Check projects table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;
```

### 3. Verify Indexes
```sql
-- List all indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 4. Verify RLS is Enabled
```sql
-- Check RLS status on key tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

All should show `rowsecurity = true`

### 5. Test Application
```bash
npm run dev
```

Try these actions:
- [ ] Login with GitHub (creates user_sessions)
- [ ] Create a project (tests projects table)
- [ ] Start AI chat (tests chat_messages)
- [ ] Create a site (tests sites/pages)
- [ ] Deploy (tests deployments)
- [ ] Check settings (tests user_preferences)

---

## 🔧 What's Included in This Migration

### Tables Created (23 total)

**Core Application** (8 tables)
- projects - Coding projects
- chat_messages - AI conversations
- deployments - Site deployments
- actions - Action history
- code_versions - Code versions
- history_snapshots - State snapshots
- file_revisions - File versions
- file_snapshots - File backups

**Organization & User** (4 tables)
- organizations - Team/org
- organization_members - Team members
- user_preferences - User settings
- user_sessions - Session management

**Integration** (3 tables)
- integrations - Org-level integrations
- user_integrations - User-level integrations
- user_env_vars - Environment variables

**Billing & Usage** (4 tables)
- user_ai_usage - AI usage tracking
- api_usage_logs - API logs
- solana_payments - Crypto payments
- invoices - Billing invoices

**Sites & Pages** (2 tables)
- sites - Website projects
- pages - Website pages

**Logging & Audit** (2 tables)
- activity_logs - Audit trail
- action_logs - Action history
- actions - Action tracking

### Indexes Created
- B-tree indexes on foreign keys and frequently queried columns
- GIN indexes on JSONB columns for better performance
- Composite indexes for common query patterns

### RLS Policies
- User isolation policies
- Organization-based access control
- Secure by default

### Views Created
- `user_organizations` - Org view with member info
- `user_projects_with_stats` - Projects with message/deployment counts

---

## ⚠️ Troubleshooting

### Issue: "Relation does not exist"
**Cause**: Some tables are missing
**Solution**: 
1. Check that migration completed without errors
2. Verify all tables exist in Supabase UI
3. If missing, re-run the migration

### Issue: "Permission denied"
**Cause**: Not using service role key or insufficient permissions
**Solution**:
1. Verify you're signed in as project owner
2. Check service role key in `.env`
3. Try again in Supabase dashboard UI

### Issue: "Constraint violation"
**Cause**: Invalid data in existing tables
**Solution**:
1. This shouldn't happen (you made backup first, right?)
2. Restore from backup
3. Clean up invalid data
4. Re-run migration

### Issue: Migration times out
**Cause**: Large transaction taking too long
**Solution**:
1. Use METHOD 2 (Split Execution)
2. Execute phases one at a time
3. Wait for each phase to complete before starting next

### Issue: App shows "table does not exist" errors
**Cause**: RLS policies too restrictive or migration incomplete
**Solution**:
1. Check RLS policies are created
2. Verify user is authenticated
3. Check application has correct environment variables
4. Restart dev server: `npm run dev`

---

## 🎯 After Migration

### 1. Restart Application
```bash
npm run dev
```

### 2. Test Core Features
- User authentication
- Project creation and editing
- Chat with AI
- File operations
- Deployment

### 3. Monitor Logs
```bash
# Check for errors
npm run dev

# Watch Supabase logs
# https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/logs
```

### 4. Verify Billing Still Works
- Check user_ai_usage table has records
- Check api_usage_logs has records
- Verify solana_payments is tracking

### 5. Keep Backup Safe
- Your backup is still available for 30 days
- You can restore anytime if issues occur
- Keep a note of backup ID

---

## 📞 Support & Help

### If Something Goes Wrong:

1. **Check logs**: 
   - App logs: Terminal output from `npm run dev`
   - Supabase logs: https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/logs

2. **Restore from backup**:
   - Go to https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/settings/backups
   - Click restore icon next to your backup
   - Wait for restoration to complete

3. **Verify migration**:
   - Check tables exist
   - Check row count in key tables
   - Run `npm run dev` and test

### Additional Resources:
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs
- Migration Guide: SCHEMA_CLEANUP_ASSESSMENT.md
- Table Usage Map: SCHEMA_TABLE_USAGE_MAP.md

---

## 🚀 Deployment Checklist

- [ ] Backup created and verified
- [ ] Migration executed without errors
- [ ] All 23 tables present
- [ ] Indexes created successfully
- [ ] RLS policies enabled
- [ ] Application tested and working
- [ ] Core features verified
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Backup ID saved

---

**Status**: Ready for production

**Last Updated**: 2024

**Environment**: Supabase Project (berjjbyhpxnarpjgvkhq)
