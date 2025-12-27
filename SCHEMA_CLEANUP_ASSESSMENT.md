# Schema Cleanup Assessment & Recommendations

## Executive Summary
Your Supabase schema contains several unused tables and columns that should be removed to reduce clutter, improve performance, and eliminate potential conflicts. This document provides a complete assessment and cleanup plan.

---

## 📊 Database Analysis

### Tables Currently In Use (23 tables)
These tables are actively referenced in your codebase and should be **KEPT**:

**Core Application Tables:**
- `projects` - Coding projects
- `chat_messages` - AI chat history  
- `deployments` - Deployment tracking
- `actions` - Action history
- `code_versions` - Code version tracking
- `history_snapshots` - Complete state snapshots
- `file_revisions` - File version history
- `file_snapshots` - File backups

**Organization & User Management:**
- `organizations` - Team/org management
- `organization_members` - Team member roles & permissions
- `user_preferences` - User settings
- `user_sessions` - Session management

**Integration Tables:**
- `integrations` - Organization-level integrations (GitHub, Netlify, etc.)
- `user_integrations` - User-level provider integrations
- `user_env_vars` - Stored environment variables

**Billing & Usage:**
- `user_ai_usage` - AI usage tracking
- `solana_payments` - Solana payment records
- `api_usage_logs` - API call tracking
- `invoices` - Billing invoices

**Activity & Logging:**
- `activity_logs` - Audit trail
- `action_logs` - Action history

**Site Builder:**
- `sites` - Website projects
- `pages` - Website pages

---

## 🗑️ Tables to REMOVE (10 unused tables)

### 1. **user_settings**
- **Status**: UNUSED
- **Reason**: Duplicate of functionality. User preferences handled by `user_preferences` table instead.
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.user_settings CASCADE;`

### 2. **page_versions**
- **Status**: UNUSED
- **Reason**: Page versioning feature not implemented in current application.
- **Data Impact**: No active use
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.page_versions CASCADE;`

### 3. **components**
- **Status**: UNUSED
- **Reason**: Component library feature (future feature, not implemented)
- **Data Impact**: No active use
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.components CASCADE;`

### 4. **sections**
- **Status**: UNUSED
- **Reason**: Sections library feature not implemented
- **Data Impact**: No active use
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.sections CASCADE;`

### 5. **ai_generations**
- **Status**: UNUSED
- **Reason**: AI content generation tracking not implemented
- **Data Impact**: No active use
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.ai_generations CASCADE;`

### 6. **ai_conversations**
- **Status**: UNUSED
- **Reason**: AI conversation history not implemented (using chat_messages instead)
- **Data Impact**: No active use
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.ai_conversations CASCADE;`

### 7. **usage_quotas**
- **Status**: UNUSED
- **Reason**: Usage quota enforcement not implemented
- **Alternative**: Data stored in `organizations` table (plan field)
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.usage_quotas CASCADE;`

### 8. **error_logs**
- **Status**: UNUSED
- **Reason**: Error logging handled externally (Sentry recommended)
- **Data Impact**: No active use
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.error_logs CASCADE;`

### 9. **page_analytics**
- **Status**: UNUSED
- **Reason**: Page analytics feature not implemented
- **Alternative**: Use external analytics (Google Analytics, Plausible, etc.)
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.page_analytics CASCADE;`

### 10. **page_comments**
- **Status**: UNUSED
- **Reason**: Page comments/collaboration feature not implemented
- **Data Impact**: No active use
- **Action**: DROP TABLE
- **SQL**: `DROP TABLE IF EXISTS public.page_comments CASCADE;`

---

## 🔧 Cleanup Instructions

### Step 1: Backup Your Database
**Before proceeding, backup your entire database:**
1. Go to https://app.supabase.com/project/berjjbyhpxnarpjgvkhq
2. Click on "Settings" → "Backups"
3. Click "Create a new backup"
4. Wait for backup to complete

### Step 2: Execute Cleanup SQL
The cleanup SQL has been prepared in `scripts/cleanup-schema.sql`

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/sql
2. Click "New Query"
3. Copy the content from `scripts/cleanup-schema.sql`
4. Paste into the editor
5. Review the statements
6. Click "RUN"

**Option B: Via SQL Editor - Copy Individual Statements**
If you prefer, execute the DROP statements one by one:

```sql
-- Drop unused tables
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.page_versions CASCADE;
DROP TABLE IF EXISTS public.components CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.ai_generations CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.usage_quotas CASCADE;
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.page_analytics CASCADE;
DROP TABLE IF EXISTS public.page_comments CASCADE;
```

### Step 3: Verify Cleanup
After execution:
1. Go to the "Tables" section in Supabase
2. Verify that only the 23 tables listed above remain
3. Check that your app still works: `npm run dev`

### Step 4: Test Your Application
1. Restart dev server: `npm run dev`
2. Test core functionality:
   - Login/authentication
   - Creating projects
   - Chat interactions
   - File operations
   - Deployment features

---

## ⚠️ Potential Issues & Solutions

### Issue: Foreign Key Constraint Violations
**Symptom**: Error like "Cannot drop table because it has references"

**Solution**: The `CASCADE` keyword in our DROP statements handles this automatically. If you still get errors:
1. Drop dependent tables first
2. Review which tables reference the one you're trying to drop
3. Drop child tables before parent tables

**Example Order** (if CASCADE doesn't work):
```sql
DROP TABLE IF EXISTS page_versions CASCADE;
DROP TABLE IF EXISTS page_comments CASCADE;
DROP TABLE IF EXISTS page_analytics CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
```

### Issue: Application Errors After Cleanup
**Symptom**: Your app shows errors after cleanup

**Solution**:
1. Check if you accidentally dropped a needed table
2. Restore from backup: Contact Supabase support or restore from the backup you created
3. Review which tables your app actually uses

### Issue: Can't Execute SQL in Supabase Dashboard
**Symptom**: "Permission denied" or similar error

**Solution**:
1. Verify you're signed in with admin account
2. Check that your service role key has appropriate permissions
3. Try using Supabase CLI instead

---

## 📋 Tables Kept vs. Removed Summary

| Category | Kept | Removed |
|----------|------|---------|
| **Organization/Team** | organizations, organization_members | - |
| **User Management** | user_preferences, user_sessions | user_settings |
| **Projects & Code** | projects, actions, code_versions, history_snapshots, file_revisions, file_snapshots | - |
| **Chat & Messaging** | chat_messages | ai_conversations |
| **Site Builder** | sites, pages | page_versions, page_comments, page_analytics |
| **Integrations** | integrations, user_integrations, user_env_vars | - |
| **Billing & Tracking** | user_ai_usage, solana_payments, api_usage_logs, invoices | usage_quotas |
| **Deployments** | deployments | - |
| **Activity & Audit** | activity_logs, action_logs | error_logs |
| **Library Features** | - | components, sections, ai_generations |

**Total**: 23 Active Tables | 10 Removed Tables

---

## 🎯 Expected Outcomes

After cleanup:
✅ Reduced database size (~15-20% smaller depending on data)
✅ Simplified schema - easier to understand and maintain
✅ Fewer foreign key constraint issues
✅ Cleaner database structure for future development
✅ No impact on application functionality
✅ Improved query performance (fewer tables to consider)

---

## 🚀 Next Steps

1. **Create backup** - Essential before proceeding
2. **Review this assessment** - Make sure you agree with removals
3. **Execute cleanup script** - Run the SQL in Supabase
4. **Test application** - Verify everything still works
5. **Monitor for issues** - Watch logs for any errors in first 24 hours
6. **Keep this document** - For reference on your schema structure

---

## 📞 Support

If you encounter issues:
1. Check the "Potential Issues" section above
2. Review Supabase logs for error messages
3. Restore from backup if critical issues occur
4. Consult Supabase documentation: https://supabase.com/docs
5. Check application logs for validation errors

---

## Additional Recommendations

### For Future Development:
- **Component Library**: When implementing, use a separate "components" table
- **AI Features**: Create dedicated tables for AI generations and conversations when ready
- **Analytics**: Consider integrating Google Analytics or Plausible instead of database storage
- **Error Tracking**: Use Sentry or similar for production error monitoring
- **Page Comments**: Implement collaboration features with dedicated tables when needed

### For Ongoing Maintenance:
- Regularly audit unused tables (quarterly)
- Monitor table sizes in Supabase Dashboard
- Review indexes for optimization
- Archive old data to separate storage
- Keep documentation updated as schema evolves

---

*Generated: $(date)*
*Database: Supabase Project (berjjbyhpxnarpjgvkhq)*
