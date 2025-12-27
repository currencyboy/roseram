# Authentication Error Solution - Complete Guide

## Error You're Experiencing
```
AuthApiError: Invalid login credentials
  at handleError (webpack-internal:///(app-pages-browser)/./node_modules/@supabase/auth-js/...)
```

## What's Happening? 🔍

Your Supabase database is missing **Row Level Security (RLS) policies** that allow:
- ✗ New users to create accounts
- ✗ Users to sign in with their credentials  
- ✗ Users to access their data

This is a **security feature** - Supabase defaults to "deny all" until you explicitly allow access.

---

## Fix in 3 Simple Steps

### Step 1: Go to Supabase Dashboard (2 minutes)

1. Open https://app.supabase.com
2. Click on your project `berjjbyhpxnarpjgvkhq`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** (top button)

### Step 2: Copy & Paste This SQL

```sql
-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ==============================
-- user_profiles table policies
-- ==============================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================
-- users table policies
-- ==============================
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

CREATE POLICY "Users can insert their own record"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================
-- projects table policies
-- ==============================
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can read their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 3: Run and Test

1. **Click the Play button** (▶) to execute the SQL
2. Wait for success message ✓
3. **Test the app:**
   - Create a new account with any email/password
   - Or use test credentials: `test@example.com` / `Test123!@#`
   - You should now be able to sign in!

---

## Verify the Fix (Optional)

Run this command in your terminal to verify everything:

```bash
npm run verify-auth
```

This will:
- ✓ Check Supabase connection
- ✓ Show existing users
- ✓ Create a test user if needed
- ✓ Test sign-in functionality

---

## Understanding the Fix 📚

### What are RLS Policies?
They're security rules that say who can do what with your data:
- "Users can insert their own profile" = Users can create their own data
- "Users can read their own profile" = Users can see their own data
- "Users can update their own profile" = Users can modify their own data

### How They Work
When you sign in, Supabase sets `auth.uid()` to your user ID. The policy checks:
- Is the user trying to access their own data? (`auth.uid() = user_id`)
- Yes? Allow it! ✓
- No? Deny it! ✗

### Why This Was Missing
RLS is optional. By default, no policies = no access for anyone (super secure). For auth to work, you need to explicitly allow users to access their own records.

---

## Still Not Working? 🔧

### Debug Option 1: Check Browser Console
Press **F12** → Click **Console** tab
Look for logs starting with `[AUTH]` or `[Supabase]`

These logs now show:
```javascript
[AUTH] Sign in result: {
  hasError: false,
  hasSession: true,
  hasUser: true,
  userEmail: "user@example.com"
}
```

### Debug Option 2: Verify Your Tables
Copy this into Supabase SQL Editor:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

You should see:
- `users`
- `user_profiles`
- `projects`
- (and others)

If any are missing, that's the problem!

### Debug Option 3: Check RLS Policies
```sql
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

Should show your new policies.

### Debug Option 4: Test Auth Directly
Create a new SQL query in Supabase:
```sql
-- This simulates a sign-in attempt
SELECT auth.uid();
```

If this works, your auth is configured correctly.

---

## Environment Variables ✓

Your app has all required variables:
- ✓ `NEXT_PUBLIC_SUPABASE_PROJECT_URL`
- ✓ `NEXT_PUBLIC_SUPABASE_ANON` (auth key)
- ✓ `SUPABASE_SERVICE_ROLE` (admin key)

No changes needed here!

---

## What Changed in Your Code

1. **`lib/auth.js`** - Better error messages and validation
2. **`lib/auth-diagnostics.js`** - NEW: Diagnostic utility for debugging
3. **`components/AuthProvider.jsx`** - Runs diagnostics on startup
4. **`components/FloatingAuthModal.jsx`** - Enhanced error logging
5. **`scripts/verify-auth-setup.js`** - NEW: Verification script
6. **`scripts/check-db-schema.js`** - NEW: Schema checking script
7. **`scripts/fix-rls-policies.js`** - NEW: RLS policy display script
8. **`package.json`** - Added new scripts: `verify-auth`, `check-schema`, `fix-rls`

---

## Next Steps

### Immediate (Do Now)
1. ✅ Copy the SQL from Step 2 above
2. ✅ Go to Supabase SQL Editor
3. ✅ Paste and run it
4. ✅ Test sign-in in your app

### Short Term (Next 5 minutes)
1. ✅ Create a test account
2. ✅ Check browser console (F12) for logs
3. ✅ Run `npm run verify-auth` if issues persist

### Troubleshooting (If Needed)
1. ✅ Use browser DevTools (F12 → Console) to see detailed logs
2. ✅ Follow the "Still Not Working?" section above
3. ✅ Check Supabase docs: https://supabase.com/docs/guides/auth

---

## Support Resources

- **Supabase RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **SQL Editor**: https://app.supabase.com/project/berjjbyhpxnarpjgvkhq/sql/new

---

## Summary

| What | Status | Action |
|------|--------|--------|
| Supabase URL | ✅ Configured | None needed |
| Auth Keys | ✅ Configured | None needed |
| Database Tables | ✅ Exist | None needed |
| **RLS Policies** | ❌ **Missing** | **↑ Follow Step 2 Above ↑** |

Once you run the SQL in Step 2, authentication will work! 🎉
