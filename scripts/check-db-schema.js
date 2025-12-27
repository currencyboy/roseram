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

async function checkSchema() {
  console.log("\n📊 Checking Database Schema...\n");
  
  try {
    // List all tables in public schema
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
    
    if (tablesError) {
      console.log("Using direct SQL query method...");
      
      // Try getting user profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (profileError) {
        console.log("❌ user_profiles table: NOT FOUND");
        console.log(`   Error: ${profileError.message}`);
      } else {
        console.log("✓ user_profiles table: EXISTS");
      }
      
      // Try getting users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (usersError) {
        console.log("❌ users table: NOT FOUND");
        console.log(`   Error: ${usersError.message}`);
      } else {
        console.log("✓ users table: EXISTS");
      }
      
      // Try getting projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
      
      if (projectsError) {
        console.log("❌ projects table: NOT FOUND");
      } else {
        console.log("✓ projects table: EXISTS");
      }
      
      console.log("\n⚠️  Note: Cannot query information_schema directly");
      console.log("   You may need to check your Supabase dashboard for:");
      console.log("   1. Table structures");
      console.log("   2. RLS (Row Level Security) policies");
      console.log("   3. Triggers or constraints that might be preventing user creation");
      
    } else {
      console.log("✓ Found tables:", tables);
    }
    
  } catch (err) {
    console.error("Error checking schema:", err.message);
  }
  
  console.log("\n");
}

checkSchema();
