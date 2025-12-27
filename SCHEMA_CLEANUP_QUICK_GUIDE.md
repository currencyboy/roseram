# 🚀 Quick Schema Cleanup Guide

## TL;DR - What's Being Removed?

**10 unused tables** that take up space and complicate your schema:

```
user_settings       ❌ (use user_preferences instead)
page_versions       ❌ (versioning not used)
components          ❌ (library feature not implemented)
sections            ❌ (library feature not implemented)
ai_generations      ❌ (not implemented)
ai_conversations    ❌ (use chat_messages instead)
usage_quotas        ❌ (not tracked)
error_logs          ❌ (use Sentry instead)
page_analytics      ❌ (use Google Analytics instead)
page_comments       ❌ (collaboration not implemented)
```

---

## ⚡ Execute Cleanup (1 min setup)

### 1. Backup First (REQUIRED ⚠️)
```
https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/settings/backups
→ Click "Create a new backup"
→ Wait for green checkmark
```

### 2. Open SQL Editor
```
https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/sql
```

### 3. Create New Query
Click the **"New Query"** button (blue button, top-left)

### 4. Paste This SQL
```sql
-- Drop 10 unused tables
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

### 5. Click RUN ▶️
That's it! Your schema is cleaned up.

---

## ✅ Verify It Worked

### Check Tables
1. Go to: https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/editor
2. Look for the tables list on the left
3. You should see only **23 tables** (was probably 33+)

### Test Your App
```bash
npm run dev
```
Your app should work exactly the same, just with a cleaner database.

---

## 🔍 Tables You're Keeping (23 tables)

These are **essential and actively used**:

### Core Features (8)
- projects
- chat_messages
- deployments
- actions
- code_versions
- history_snapshots
- file_revisions
- file_snapshots

### Organization (2)
- organizations
- organization_members

### User Settings (2)
- user_preferences
- user_sessions

### Integrations (3)
- integrations
- user_integrations
- user_env_vars

### Billing (4)
- user_ai_usage
- solana_payments
- api_usage_logs
- invoices

### Website Builder (2)
- sites
- pages

### Audit Trail (2)
- activity_logs
- action_logs

---

## ❌ Oops! Something Went Wrong?

### Error: "Table does not exist"
→ Table already deleted, this is fine. Keep going.

### Error: "Permission denied"
→ Make sure you're logged in as project owner
→ Try again in a few minutes

### App Stopped Working
→ Restore from backup (you made one, right? 👉 Step 1)

---

## 📊 Impact Analysis

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| Tables | 33 | 23 | -10 unused |
| Schema Clarity | 📉 Complex | 📈 Clean | +Simpler |
| Query Performance | Normal | Better | +Optimized |
| Maintenance | Hard | Easy | +Maintainable |
| Development Speed | Slower | Faster | +Better DX |

---

## Next Steps

1. ✅ Backup (5 min)
2. ✅ Run cleanup SQL (1 min)
3. ✅ Test app (2 min)
4. 🎉 Done!

---

**Questions?** Check `SCHEMA_CLEANUP_ASSESSMENT.md` for detailed explanations.
