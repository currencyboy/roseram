# 🚨 IMMEDIATE ACTION PLAN - Database Recovery

Your database is broken. Here's exactly what to do RIGHT NOW.

---

## ⚡ FASTEST FIX (5 minutes)

### Step 1: Open Supabase Dashboard
```
Go to: https://app.supabase.com
Select your project
Click: SQL Editor (left sidebar)
```

### Step 2: Copy the SQL
```
Open: scripts/rebuild-schema.sql
Select all (Ctrl+A or Cmd+A)
Copy (Ctrl+C or Cmd+C)
```

### Step 3: Run in Dashboard
```
In Supabase SQL Editor:
1. Click "New Query"
2. Paste the SQL
3. Click "Run"
4. Wait for completion (should say "Query successful")
```

### Step 4: Done!
```
Your database is fixed
Your data is preserved
Your app will work again
```

---

## 🔧 IF YOU PREFER COMMAND LINE

### Requirements
```bash
# macOS
brew install libpq

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
choco install postgresql
```

### Command to Run
```bash
# Set your credentials (get from Supabase dashboard > Settings > API)
export SUPABASE_PROJECT_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE="<your-service-role-key>"

# Run the fix
chmod +x scripts/apply-rebuild-v2.sh
./scripts/apply-rebuild-v2.sh
```

---

## 📋 VERIFY IT WORKED

After running the migration, verify:

### Check 1: Tables Exist
In Supabase SQL Editor, run:
```sql
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';
```
Should return: **30** or more tables

### Check 2: Foreign Keys Exist
```sql
SELECT COUNT(*) as fk_count FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
```
Should return: **20** or more foreign keys

### Check 3: Your App Works
```bash
npm run dev
```
Should start without database errors

---

## 🚀 WHAT GETS FIXED

### Core Tables Created
- ✅ `projects` - Your project files
- ✅ `chat_messages` - AI conversations
- ✅ `deployments` - Build history
- ✅ `file_revisions` - File versions
- ✅ `sites` - Website builder
- ✅ `pages` - Page content
- ✅ `organizations` - Teams
- ✅ `organizations_members` - Team members
- ✅ And 22 more...

### Constraints Restored
- ✅ FOREIGN KEY constraints (data relationships)
- ✅ UNIQUE constraints (no duplicates)
- ✅ CHECK constraints (valid values)
- ✅ GIN indexes (fast searches)
- ✅ RLS policies (security)

### Data Status
- ✅ **NO DATA IS DELETED**
- ✅ All your data is preserved
- ✅ Safe to run multiple times

---

## ⚠️ COMMON ISSUES

### "ERROR: X does not exist"
- **Cause:** Migration didn't complete
- **Fix:** Try running again, check for error messages

### "ERROR: permission denied"
- **Cause:** Wrong API key
- **Fix:** Use `SUPABASE_SERVICE_ROLE` not `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Tables already exist"
- **Cause:** Migration ran before
- **Fix:** That's okay! The script uses `IF NOT EXISTS` to prevent errors

### App still broken
- **Steps:**
  1. Run verification checks above ⬆️
  2. Check that all tables exist
  3. Restart your app: `npm run dev`
  4. Check browser console for errors
  5. If stuck, read `DATABASE_REBUILD_GUIDE.md`

---

## 📍 WHERE TO GET CREDENTIALS

### In Supabase Dashboard:
1. Click your project
2. **Settings** (bottom left)
3. **API** (in Settings menu)
4. Copy these:

```
Project URL              → SUPABASE_PROJECT_URL
Service Role Secret      → SUPABASE_SERVICE_ROLE
(NOT the anon key!)
```

---

## 📊 EXPECTED RESULTS

### Before
```
❌ App crashes when reading database
❌ Foreign key violations
❌ Can't create/update records
❌ "table does not exist" errors
```

### After
```
✅ App works normally
✅ All database operations work
✅ Data is validated
✅ No errors
```

---

## 📚 FILES CREATED

| File | What To Do |
|------|-----------|
| `scripts/rebuild-schema.sql` | Run this (copy-paste in Supabase) |
| `scripts/apply-rebuild-v2.sh` | Or run this (bash script) |
| `DATABASE_REBUILD_GUIDE.md` | Read if you need help |
| `IMMEDIATE_ACTION_PLAN.md` | This file |

---

## ✅ CHECKLIST

- [ ] Get Supabase credentials
- [ ] Copy SQL or run bash script
- [ ] Wait for "Query successful" message
- [ ] Run verification checks
- [ ] Test your app with `npm run dev`
- [ ] Check console for errors
- [ ] Everything works? 🎉

---

## 🆘 STUCK? 

### Option 1: Read Full Guide
→ Open `DATABASE_REBUILD_GUIDE.md`

### Option 2: Check Database
→ Go to Supabase dashboard SQL Editor
→ Run: `SELECT version();`
→ If this works, database is accessible

### Option 3: Try Again
→ The migration is safe to run multiple times
→ Just run it again (copy-paste the SQL again)

### Option 4: Reset Database
→ Last resort: Restore from backup
→ Supabase Dashboard → Settings → Backups → Restore

---

## ⏱️ TIMELINE

```
T+0:    Start migration
T+1-3m: Migration running (SQL executes)
T+3m:   Click "Done"
T+5m:   Verify with checks above
T+10m:  Test app works
T+15m:  Everything fixed!
```

---

## 🎯 GOAL

Get your app working again with a complete, properly constrained database that the application code actually needs.

**Status:** Ready to fix (all files created)  
**Risk Level:** Very Low (no data loss)  
**Time Needed:** 5-15 minutes  
**Difficulty:** Easy (copy-paste)  

---

**👉 NEXT STEP:** Open Supabase Dashboard and run the SQL now!

Questions? Read `DATABASE_REBUILD_GUIDE.md` for detailed instructions.
