# Authentication Error Fix Guide

## Issue Summary

You're seeing this error:
```
AuthApiError: Invalid login credentials
```

### Root Cause
Your Supabase database is missing proper **Row Level Security (RLS) policies** that allow users to:
1. Create their accounts during sign-up
2. Sign in with their credentials
3. Access their data after authentication

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy the Fix Script
Run the following SQL to fix all RLS policies:

```sql
-- Enable RLS on tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
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
  USING (auth.uid() = user_id);

-- users table policies
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
  USING (auth.uid() = id);

-- projects policies
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
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 3: Test Sign In
After running the SQL:
1. Create a new account with any email/password
2. Or use the test credentials: **test@example.com** / **Test123!@#**

## Verify the Fix Works

Run this command to verify:
```bash
npm run verify-auth
```

This will:
- ✓ Check Supabase connection
- ✓ List existing users
- ✓ Create a test user
- ✓ Test sign-in with test user

## Detailed Explanation

### What are RLS Policies?
Row Level Security (RLS) policies in Supabase control who can access which data. They're like locks on your database tables.

### Why This Happened
When you don't define RLS policies on a table, by default **no one can access it** (even if they're authenticated). This is the secure default.

For authentication to work:
- New users need to CREATE records in `user_profiles` when they sign up
- Users need to READ their own records when they sign in
- Users need to UPDATE their profile information

Without these policies, the database rejects the operations.

### The Fix
Each policy says: "Allow authenticated users to perform X operation on their own records" by checking `auth.uid() = user_id` (or `id`).

## Still Having Issues?

### 1. Check Table Names
Your database might use different table names. Run this query to see your tables:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### 2. Verify Column Names
Check what column stores the user reference:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles';
```

### 3. Check Auth Settings
In Supabase Dashboard:
1. Go to **Auth** → **Providers**
2. Ensure **Email** provider is enabled
3. Go to **Settings** → **Security** and check:
   - Email confirmations: Usually "Confirm email" is enough
   - Session expiry: Should be reasonable (e.g., 1 hour)

### 4. Browser Console Logs
The app now has enhanced logging. Check browser DevTools (F12) → Console for:
```
[AUTH] Sign in result: { ... }
```

Look for the actual error message from Supabase.

## Next Steps

1. ✅ Run the SQL fix above
2. ✅ Test with `npm run verify-auth`
3. ✅ Try signing up/in in the app
4. ✅ Check browser console for detailed logs

## Need Help?

- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **RLS Policies**: https://supabase.com/docs/guides/auth/row-level-security
- **Browser DevTools**: Press F12 → Console tab for detailed logs
