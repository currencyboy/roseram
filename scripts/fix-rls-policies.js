#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || 
  process.env.SUPABASE_PROJECT_URL;

const serviceKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixRLSPolicies() {
  console.log("\n🔐 Fixing RLS Policies for Authentication\n");
  console.log("=" .repeat(50));
  
  try {
    // The issue is that when new users are created via Supabase Auth,
    // they need to be able to insert records into user_profiles and users tables
    // This requires RLS policies that allow authenticated users to insert their own records
    
    console.log("\n📋 SQL Migrations to Run in Supabase:\n");
    
    const migrations = `
-- 1. Enable RLS on auth.users (if not already enabled)
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- 2. Fix user_profiles table RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix users table RLS (if it exists and is separate from user_profiles)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own record
CREATE POLICY "Users can insert their own record"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read their own record
CREATE POLICY "Users can read their own record"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to update their own record
CREATE POLICY "Users can update their own record"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Fix projects table RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own projects
CREATE POLICY "Users can insert their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own projects
CREATE POLICY "Users can read their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to update their own projects
CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);
    `;
    
    console.log(migrations);
    
    console.log("\n" + "=" .repeat(50));
    console.log("\n📝 Steps to Apply:\n");
    console.log("1. Go to https://app.supabase.com");
    console.log("2. Select your project");
    console.log("3. Go to SQL Editor");
    console.log("4. Click 'New Query'");
    console.log("5. Copy and paste the SQL above");
    console.log("6. Run the query");
    console.log("\n⚠️  Note: If policies already exist, you may need to:");
    console.log("   - First drop existing policies with: DROP POLICY IF EXISTS \"policy_name\" ON table_name;");
    console.log("   - Or just replace them by running with CREATE POLICY ... ON CONFLICT DO NOTHING");
    
    console.log("\n🔗 Alternatively, visit the SQL Editor in your Supabase dashboard:");
    console.log(`   https://app.supabase.com/project/_/sql/new`);
    
    console.log("\n");
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

fixRLSPolicies();
