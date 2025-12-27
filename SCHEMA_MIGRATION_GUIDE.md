# Roseram Builder - Unified Schema Migration Guide

## Overview

This guide covers the complete migration to a unified, production-ready database schema that supports:

- **Code Editor Projects** - Projects for code editing with version control, deployments, and AI generation
- **Website Builder** - Visual site builder with pages, components, sections, and template support
- **Multi-tenant Organizations** - Team collaboration with role-based access control (RBAC)
- **Billing & Usage Tracking** - Subscription management, API usage, and quotas
- **Integrations** - GitHub, Netlify, Stripe, and other services
- **Analytics & Monitoring** - Error tracking, activity logs, and usage statistics

---

## Schema Architecture

### Design Principles

1. **Dual Workflow Support** - Projects for code editing AND Sites for visual building (both supported)
2. **Proper Relationships** - Foreign keys organized hierarchically with cascading deletes
3. **Comprehensive Indexing** - Indexes on frequently queried columns for performance
4. **Row-Level Security** - RLS policies ensure data isolation by user/organization
5. **Audit Trail** - Activity logs for compliance and debugging
6. **Scalability** - Views and aggregations for analytics without expensive queries

### Core Table Groups

#### 1. Authentication & Authorization
- `user_settings` - Per-user preferences
- `user_sessions` - Session management and deduplication detection
- `organizations` - Multi-tenant workspace containers
- `organization_members` - Team membership with RBAC roles

#### 2. Code Editor (Projects)
- `projects` - Individual code editing projects
- `code_generations` - AI-generated code outputs
- `chat_messages` - Conversation history with AI
- `file_revisions` - Version history of files
- `file_snapshots` - Complete file state snapshots
- `action_logs` - User action audit trail

#### 3. Website Builder (Sites)
- `sites` - Website containers within organizations
- `pages` - Individual pages within sites
- `page_versions` - Page version history
- `components` - Reusable UI components
- `sections` - Pre-built page sections
- `page_comments` - Collaborative comments

#### 4. AI & Generation
- `ai_generations` - AI-generated content (for sites/pages)
- `ai_conversations` - Multi-turn AI conversations

#### 5. Deployments & Hosting
- `deployments` - Deploy records for projects and sites (GitHub, Netlify, Vercel)

#### 6. Integrations & Credentials
- `integrations` - Organization-level integration credentials
- `user_integrations` - User-level integration tokens
- `api_keys` - API key management

#### 7. Billing & Usage
- `invoices` - Stripe invoices
- `usage_quotas` - Per-organization plan limits
- `api_usage` - API call tracking
- `usage_stats` - Aggregated user statistics

#### 8. Analytics & Monitoring
- `page_analytics` - Page view statistics
- `error_logs` - Application error tracking
- `activity_logs` - Comprehensive audit trail

#### 9. Collaboration
- `page_comments` - Comments on pages
- `favorites` - User project favorites

---

## Migration Steps

### Step 1: Backup Existing Data (CRITICAL)

```bash
# If you have existing data in Supabase, export it first
# Go to Supabase Dashboard > Settings > Backups > Download
```

### Step 2: Access Supabase SQL Editor

1. Navigate to [https://supabase.com](https://supabase.com)
2. Select your "roseram-builder" project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 3: Run the Unified Schema Script

**Option A: Copy-Paste the Complete Script**

1. Open `/scripts/schema-unified-complete.sql`
2. Copy the entire content
3. Paste into the Supabase SQL Editor
4. Click "Run" (or Ctrl+Enter)
5. Wait for "Success. No rows returned" message

**Option B: Run Section by Section** (if you get errors)

If the complete script fails, run these sections in order:

```sql
-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Auth & Organizations (copy sections from schema-unified-complete.sql)
-- 3. Projects & Code Editor
-- 4. Sites & Pages
-- ... continue with each section
```

### Step 4: Verify Tables Created

Run this verification query:

```sql
-- List all public tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected 50+ tables including:
-- - organizations, organization_members, user_settings
-- - projects, code_generations, chat_messages, file_revisions
-- - sites, pages, page_versions, components
-- - deployments, integrations, api_keys
-- - invoices, usage_quotas, api_usage
-- - page_analytics, error_logs, activity_logs
-- - etc.
```

### Step 5: Enable Realtime (Optional)

For real-time updates on specific tables:

1. Go to Table Editor in Supabase
2. Select table (e.g., `chat_messages`, `action_logs`)
3. Click "Realtime" tab
4. Toggle "Enable Realtime"

Recommended tables for realtime:
- `chat_messages`
- `page_comments`
- `action_logs`
- `deployments`

### Step 6: Configure RLS Policies

The script includes all RLS policies. Verify they're enabled:

```sql
-- Check RLS is enabled on tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'sites', 'deployments', 'integrations')
ORDER BY tablename;

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Step 7: Update Environment Variables

Ensure `.env.local` has these variables set:

```env
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON=eyJ... (your anon key)
SUPABASE_SERVICE_ROLE=eyJ... (your service role key)
```

---

## Migration from Old Schema

### If You Have Existing Data

**⚠️ Warning: This involves data migration. Back up first!**

#### Option 1: Clean Migration (Recommended for new deployments)

```sql
-- Drop old tables (if they exist and conflict)
DROP TABLE IF EXISTS public.projects CASCADE;
-- Run new schema script
-- (The script uses IF NOT EXISTS, so it's safe)
```

#### Option 2: Preserve Existing Projects Data

If you have existing projects and want to keep them:

```sql
-- Old projects table structure might differ
-- Create a temporary table to backup old data
CREATE TABLE public.projects_backup AS 
SELECT * FROM public.projects;

-- Then run the unified schema script
-- It will CREATE IF NOT EXISTS, so won't overwrite
-- Manually migrate data as needed
```

#### Option 3: Incremental Migration

Run the schema script (uses `IF NOT EXISTS`), then:

1. Identify which tables already exist
2. Add missing tables one at a time
3. Test each section before moving to next

---

## Verification Checklist

After running the migration, verify:

- [ ] 50+ tables created successfully
- [ ] All indexes created
- [ ] RLS policies enabled on all public tables
- [ ] Views created (`user_organizations`, `user_sites`, etc.)
- [ ] Foreign key constraints in place
- [ ] No errors in Supabase logs

### Test Queries

```sql
-- Test basic query (requires auth)
SELECT * FROM public.projects LIMIT 1;

-- Test RLS policy (user-specific)
SELECT * FROM public.user_settings LIMIT 1;

-- Test organization access
SELECT * FROM public.organizations LIMIT 1;

-- Test joined query
SELECT p.name, u.email
FROM public.projects p
LEFT JOIN public.deployments d ON p.id = d.project_id
LIMIT 5;
```

---

## Troubleshooting

### Error: "Cannot insert into table - violates foreign key constraint"

**Cause:** Trying to insert data that references non-existent parent records

**Solution:**
```sql
-- Ensure parent tables have data first
-- Example: insert organization before site
INSERT INTO public.organizations (name, slug, owner_id) VALUES (...);
-- Then insert site
INSERT INTO public.sites (organization_id, name, slug) VALUES (...);
```

### Error: "Relation does not exist"

**Cause:** Table wasn't created (possibly due to script error)

**Solution:**
```sql
-- Check if table exists
SELECT to_regclass('public.projects');
-- If NULL, table doesn't exist - run creation script again
```

### Error: "RLS policy prevents SELECT"

**Cause:** Row-level security is too restrictive or auth not set up

**Solution:**
```sql
-- Temporarily disable RLS for testing (ONLY in development!)
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Test query
SELECT * FROM public.projects;

-- Re-enable RLS when done
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Ensure Supabase Auth is configured
-- Check: Settings > Authentication > Providers
```

### Error: "Too many results" or Query Timeout

**Cause:** Missing indexes or inefficient queries

**Solution:**
- Verify all indexes were created: `SELECT * FROM pg_indexes WHERE schemaname = 'public';`
- Add missing indexes manually if needed
- Use EXPLAIN ANALYZE to check query plans

---

## Performance Optimization

### Key Indexes Already Included

The schema includes indexes on:
- Foreign key columns (for joins)
- Status/state columns (for filtering)
- Created_at/updated_at (for time-based queries)
- Unique constraint columns (for lookups)

### Additional Indexes You Might Need

```sql
-- If you query by email frequently
CREATE INDEX users_email_idx ON auth.users(email);

-- If you filter projects by tags
CREATE INDEX projects_tags_idx ON public.projects USING GIN(tags);

-- If you search site slugs
CREATE INDEX sites_search_idx ON public.sites 
  USING GIN(to_tsvector('english', name || ' ' || slug));
```

### Query Examples

```sql
-- Fast: Uses index on user_id
SELECT * FROM public.projects WHERE user_id = $1;

-- Fast: Uses index on status
SELECT * FROM public.deployments WHERE status = 'pending';

-- Fast: Uses index on created_at
SELECT * FROM public.error_logs 
ORDER BY created_at DESC LIMIT 100;

-- Slow: Full table scan (add index if frequent)
SELECT * FROM public.pages WHERE content ->> 'title' = 'Home';
```

---

## API Integration Updates

### Update Your Code to Use New Tables

#### Projects Example

```javascript
// Get user's projects
const { data: projects } = await supabaseServer
  .from('projects')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });

// Create new generation
await supabaseServer
  .from('code_generations')
  .insert({
    project_id: projectId,
    user_id: userId,
    prompt: 'Create a landing page',
    ai_model: 'grok-2-latest',
  });
```

#### Sites Example

```javascript
// Get organization sites
const { data: sites } = await supabaseServer
  .from('sites')
  .select('*')
  .eq('organization_id', orgId);

// Create page deployment
await supabaseServer
  .from('deployments')
  .insert({
    site_id: siteId,
    deployment_type: 'netlify',
    status: 'pending',
    user_id: userId,
  });
```

### Update lib/db.js

```javascript
export const projects = {
  // Update methods as needed
  async create(userId, project) {
    return supabaseServer
      .from('projects')
      .insert({
        user_id: userId,
        name: project.name,
        // ... other fields
      })
      .select()
      .single();
  },
};
```

---

## Backup & Recovery

### Regular Backups

Supabase automatically backs up daily. To manually export:

1. Go to Settings > Backups
2. Click download on any backup
3. Save the file securely

### Recovery Process

If something goes wrong:

1. Download backup from Supabase
2. Contact Supabase support if needed
3. They can restore to a point in time

### Manual Snapshot

```sql
-- Export a specific table
COPY public.projects TO STDOUT WITH CSV HEADER;

-- Import back
COPY public.projects FROM STDIN WITH CSV HEADER;
```

---

## Monitoring & Maintenance

### Monitor Database Health

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for bloat
SELECT schemaname, tablename, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;

-- Vacuum to clean up dead rows
VACUUM ANALYZE;
```

### Monitor Query Performance

Use Supabase's Query Performance page:
1. Dashboard > Database > Query Performance
2. Review slow queries
3. Add indexes as needed

---

## Support & Resources

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| RLS blocks all queries | Missing auth context | Ensure Supabase auth is configured |
| Foreign key errors | Data inconsistency | Check parent records exist first |
| Slow queries | Missing indexes | Run VACUUM ANALYZE and add indexes |
| Deployment fails | Schema mismatch | Verify all tables are created |

### Documentation

- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

### Getting Help

1. Check Supabase logs: Dashboard > Logs
2. Review error_logs table: `SELECT * FROM public.error_logs ORDER BY created_at DESC LIMIT 50;`
3. Contact Supabase support: https://supabase.com/support

---

## Success Indicators

You'll know the migration is successful when:

✅ All 50+ tables appear in Table Editor
✅ RLS policies are active on all public tables
✅ Can query projects, sites, and deployments
✅ Can create new records (INSERT operations work)
✅ Can update records (UPDATE operations work)
✅ No foreign key constraint errors
✅ No RLS policy errors in logs
✅ Views return correct aggregated data

---

## Next Steps

1. **Test the schema** - Run sample inserts/queries
2. **Configure integrations** - Set up GitHub, Netlify, Stripe
3. **Set up billing** - Configure Stripe webhook
4. **Enable real-time** - For chat, comments, deployments
5. **Deploy to production** - Test in staging first!
6. **Monitor** - Watch error logs and performance metrics

---

## Timeline

- **Phase 1** (Today): Run migration script
- **Phase 2** (1 day): Verify tables and test queries
- **Phase 3** (2-3 days): Update application code
- **Phase 4** (2-3 days): Test in staging
- **Phase 5** (1 day): Deploy to production

Total time: ~1 week with testing

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial unified schema |

---

**Last Updated:** 2024
**Schema Version:** Unified v1.0
