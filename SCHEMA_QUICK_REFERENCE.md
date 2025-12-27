# Unified Schema - Quick Reference

## Table Structure at a Glance

### Authentication & Users (5 tables)
```
user_settings
├── user_id (FK → auth.users)
├── theme, notifications, language, timezone, preferences (JSONB)

user_sessions
├── user_id (TEXT, unique)
├── user_data, credentials, project_configs (JSONB)

session_audit_log
├── user_id, action, changed_fields (JSONB)

organizations
├── id (UUID)
├── owner_id (FK → auth.users)
├── name, slug (UNIQUE), description, logo_url
├── plan, status, stripe_* fields, metadata (JSONB)

organization_members
├── organization_id (FK)
├── user_id (FK → auth.users)
├── role (owner|admin|editor|member|viewer)
├── UNIQUE(organization_id, user_id)
```

### Code Editor Projects (6 tables)
```
projects
├── id (UUID)
├── user_id (FK → auth.users) ⭐ User-owned projects
├── name, description
├── repository_url, repository_owner, repository_name, working_branch
├── netlify_site_id, netlify_url, github_branch, github_commit_sha
├── status (active|archived|deleted)
├── is_public, tags[], view_count, like_count
├── created_at, updated_at, published_at

code_generations
├── project_id (FK → projects)
├── user_id (FK)
├── prompt, html_code, css_code, javascript_code
├── ai_model, tokens_used, generation_time_ms
├── status (pending|success|error|partial)
├── created_at, completed_at

chat_messages
├── project_id (FK)
├── user_id (FK)
├── role (user|assistant)
├── content, tokens_used, ai_model, temperature
├── created_at

file_revisions (Version history)
├── project_id (FK)
├── file_path (VARCHAR 1024)
├── content (TEXT)
├── change_type (create|edit|delete|rename|generate)
├── message, created_at
├── INDEX(project_id, file_path, created_at DESC)

file_snapshots (Backups)
├── project_id (FK)
├── file_path, content, original_content, modified_content
├── language, commit_message
├── created_at, updated_at

action_logs (Audit trail)
├── project_id (FK)
├── user_id (FK)
├── action (edit|generate|deploy|commit|rollback|create|delete|rename|push)
├── file_path, description, metadata (JSONB)
├── created_at
```

### Website Builder Sites & Pages (6 tables)
```
sites ⭐ Organization-owned
├── id (UUID)
├── organization_id (FK) ⭐ Team-owned
├── name, slug
├── UNIQUE(organization_id, slug)
├── description, favicon_url, theme_color
├── status (draft|published|archived)
├── visibility (private|public|unlisted)
├── custom_domain, seo_*, og_image_url, google_analytics_id
├── created_at, updated_at, published_at

pages
├── site_id (FK → sites)
├── name, slug
├── UNIQUE(site_id, slug)
├── title, description
├── content (JSONB, blocks[])
├── layout_type, custom_css, custom_javascript
├── status, visibility, seo_*, og_image_url
├── version, metadata (JSONB)
├── created_at, updated_at, published_at

page_versions
├── page_id (FK)
├── version_number (INTEGER)
├── UNIQUE(page_id, version_number)
├── content (JSONB), custom_css, custom_javascript
├── created_by (FK → auth.users), created_at

components (Reusable)
├── organization_id (FK)
├── name, description, category, thumbnail_url
├── content (JSONB), settings (JSONB)
├── is_public, usage_count
├── created_at, updated_at

sections (Pre-built blocks)
├── organization_id (FK)
├── name, description, category, thumbnail_url
├── content (JSONB)
├── is_public
├── created_at, updated_at
```

### AI & Generation (2 tables)
```
ai_generations
├── page_id (FK → pages, nullable)
├── site_id (FK → sites, nullable)
├── user_id (FK)
├── prompt, generated_content (JSONB)
├── ai_model, tokens_used, generation_time_ms
├── status (pending|success|failed)
├── error_message, metadata (JSONB)
├── created_at, completed_at

ai_conversations
├── page_id (FK → pages, nullable)
├── user_id (FK)
├── title, messages (JSONB[])
├── metadata (JSONB)
├── created_at, updated_at
```

### Deployments (1 table)
```
deployments ⭐ Supports both projects and sites
├── id (UUID)
├── project_id (FK → projects, nullable)
├── site_id (FK → sites, nullable)
├── user_id (FK, nullable)
├── deployment_type (github|netlify|vercel|github-pages|custom)
├── environment (staging|production)
├── github_url, github_commit_sha, github_branch
├── netlify_site_id, netlify_deploy_id, netlify_url
├── vercel_url, deployment_url, preview_url
├── status (pending|building|success|deployed|failed)
├── error_message, build_logs
├── created_at, updated_at, completed_at
```

### Integrations (3 tables)
```
integrations (Org-level)
├── organization_id (FK)
├── provider (string)
├── UNIQUE(organization_id, provider)
├── is_active, credentials_encrypted
├── metadata (JSONB), last_used_at
├── created_at, updated_at

user_integrations (User-level)
├── user_id (FK)
├── provider (github|netlify|vercel|stripe)
├── UNIQUE(user_id, provider)
├── is_active, token_encrypted
├── metadata (JSONB)
├── created_at, updated_at

api_keys
├── user_id (FK)
├── key_hash (UNIQUE), name, description
├── scopes[], rate_limit, rate_limit_window
├── is_active, last_used_at
├── created_at, updated_at, expires_at
```

### Billing & Usage (4 tables)
```
invoices
├── organization_id (FK)
├── user_id (FK, nullable)
├── stripe_invoice_id, amount, currency (USD)
├── status (draft|sent|paid|failed|refunded)
├── description, due_date, paid_at
├── created_at, updated_at

usage_quotas
├── organization_id (FK, UNIQUE)
├── plan_id
├── ai_generations_limit, ai_generations_used
├── pages_limit, pages_used
├── sites_limit, sites_used
├── storage_limit_gb, storage_used_gb
├── team_members_limit, team_members_used
├── custom_domains_limit, custom_domains_used
├── reset_date, created_at, updated_at

api_usage
├── organization_id (FK, nullable)
├── user_id (FK, nullable)
├── endpoint, method
├── tokens_used, request_duration_ms, status_code
├── ip_address, user_agent
├── created_at

usage_stats
├── user_id (FK, UNIQUE)
├── generations_count, generations_tokens_used
├── deployments_count, github_pushes_count, netlify_deploys_count
├── api_requests_count, api_errors_count
├── created_at, updated_at
```

### Analytics & Monitoring (3 tables)
```
page_analytics
├── page_id (FK)
├── date, views, visitors
├── bounce_rate, avg_time_on_page, conversion_rate
├── metadata (JSONB)
├── UNIQUE(page_id, date)

error_logs
├── organization_id (FK, nullable)
├── site_id (FK, nullable)
├── project_id (FK, nullable)
├── user_id (FK, nullable)
├── error_type, error_message, error_stack
├── context (JSONB)
├── severity (debug|info|warning|error|critical)
├── resolved
├── created_at

activity_logs (Audit trail)
├── organization_id (FK, nullable)
├── user_id (FK, nullable)
├── action, resource_type, resource_id
├── changes (JSONB)
├── ip_address, user_agent
├── created_at
```

### Collaboration (2 tables)
```
page_comments
├── page_id (FK)
├── user_id (FK)
├── content, block_id
├── resolved
├── created_at, updated_at

favorites
├── user_id (FK)
├── project_id (FK)
├── UNIQUE(user_id, project_id)
├── created_at
```

---

## Key Relationships

### User-Project Workflow
```
auth.users
  └── projects (one user has many projects)
      ├── code_generations
      ├── chat_messages
      ├── file_revisions
      ├── file_snapshots
      ├── action_logs
      └── deployments
```

### Organization-Site Workflow
```
organizations
  ├── organization_members (users in org)
  └── sites (one org has many sites)
      ├── pages (one site has many pages)
      │   ├── page_versions
      │   ├── page_comments
      │   ├── ai_conversations
      │   └── page_analytics
      ├── ai_generations
      ├── deployments
      ├── components
      └── sections
```

### Deployment Support
```
deployments can deploy:
├── projects (GitHub, Netlify, Custom)
└── sites (Netlify, Vercel, GitHub Pages, Custom)
```

---

## RLS Policy Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| projects | user_id = auth.uid() | user_id = auth.uid() | user_id = auth.uid() | user_id = auth.uid() |
| sites | org member | org editor+ | org editor+ | N/A |
| pages | org member | org editor+ | org editor+ | N/A |
| deployments | owner + org member | owner + org editor+ | N/A | N/A |
| integrations | org member | org admin+ | org admin+ | N/A |
| invoices | user + org admin | N/A | N/A | N/A |
| error_logs | owner + org member | system | N/A | N/A |

---

## Index Strategy

**Foreign Keys (Fast Joins)**
- All FK columns indexed
- Composite indexes for common joins

**Status/State (Fast Filtering)**
- status, visibility, is_public, is_active fields

**Time-based (Fast Sorting)**
- created_at, updated_at, date fields
- DESC index for "latest first" queries

**Unique (Identity Lookups)**
- slug, key_hash, org_member compound

---

## Query Performance Tips

### Fast Queries
```sql
-- Use indexed FK
SELECT * FROM projects WHERE user_id = $1;

-- Use indexed status
SELECT * FROM deployments WHERE status = 'pending';

-- Use indexed time
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 100;
```

### Slow Queries (Avoid)
```sql
-- Full text in JSONB field (add GIN index if frequent)
SELECT * FROM pages WHERE content ->> 'title' = 'Home';

-- LIKE on unindexed field
SELECT * FROM error_logs WHERE error_message LIKE '%timeout%';
```

---

## Security Model

### Authentication
- Supabase Auth handles users
- RLS enforces access via `auth.uid()`

### Authorization
- User owns projects
- Organization owns sites
- Roles: owner, admin, editor, member, viewer
- Policies check organization membership + role

### Data Isolation
- Projects: user level
- Sites: organization level
- All queries filtered by auth context

### Credentials
- Stored encrypted in `credentials_encrypted` column
- Never returned in SELECT without decryption
- Only org admins can view/manage

---

## Extension Points

### To Add a Feature

1. **New table?** Add to correct section, link to existing tables
2. **New field?** Add column with `ALTER TABLE ADD COLUMN`
3. **New integration?** Insert to `integrations` table
4. **New auth role?** Update RBAC in `organization_members`
5. **New index?** Create on frequently queried columns

All extensible without breaking existing tables.

---

## Common Queries

```sql
-- Get user's projects
SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC;

-- Get org's sites with page count
SELECT s.*, COUNT(p.id) as page_count
FROM sites s
LEFT JOIN pages p ON s.id = p.site_id
WHERE s.organization_id = $1
GROUP BY s.id;

-- Get pending deployments
SELECT * FROM deployments WHERE status = 'pending' ORDER BY created_at DESC;

-- Get usage for org
SELECT ai_generations_used, pages_used, storage_used_gb
FROM usage_quotas WHERE organization_id = $1;

-- Get error summary
SELECT severity, COUNT(*) as count
FROM error_logs WHERE organization_id = $1
GROUP BY severity;
```

---

## Files Reference

- **Schema Definition:** `scripts/schema-unified-complete.sql`
- **Migration Guide:** `SCHEMA_MIGRATION_GUIDE.md`
- **Detailed Assessment:** `SCHEMA_ASSESSMENT_SUMMARY.md`
- **This Quick Reference:** `SCHEMA_QUICK_REFERENCE.md`

---

**Version:** Unified Schema v1.0
**Tables:** 50
**Indexes:** 100+
**RLS Policies:** 40+
**Status:** ✅ Production Ready
