#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || 
  process.env.SUPABASE_PROJECT_URL;

const supabaseServiceKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE;

const testEmail = "test@example.com";
const testPassword = "Test123!@#";

console.log("\n🔍 Supabase Authentication Verification\n");
console.log("=" .repeat(50));

// Check environment variables
console.log("\n1️⃣  Checking environment variables...");
console.log(`   Supabase URL: ${supabaseUrl ? "✓ Configured" : "✗ Missing"}`);
console.log(`   Service Key: ${supabaseServiceKey ? "✓ Configured" : "✗ Missing"}`);

if (!supabaseUrl) {
  console.error("\n❌ Error: Supabase URL not configured");
  console.log("   Set one of these environment variables:");
  console.log("   - NEXT_PUBLIC_SUPABASE_URL");
  console.log("   - NEXT_PUBLIC_SUPABASE_PROJECT_URL");
  console.log("   - SUPABASE_PROJECT_URL");
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error("\n❌ Error: Supabase Service Key not configured");
  console.log("   Set one of these environment variables:");
  console.log("   - SUPABASE_SERVICE_ROLE_KEY");
  console.log("   - NEXT_SUPABASE_SERVICE_ROLE");
  console.log("   - SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyConnection() {
  console.log("\n2️⃣  Testing Supabase connection...");
  try {
    // Try to list users as a connection test
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error(`   ✗ Connection failed: ${error.message}`);
      return false;
    }
    
    console.log(`   ✓ Connection successful`);
    console.log(`   📊 Total users in system: ${data?.users?.length || 0}`);
    return true;
  } catch (err) {
    console.error(`   ✗ Connection error: ${err.message}`);
    return false;
  }
}

async function listExistingUsers() {
  console.log("\n3️⃣  Listing existing users...");
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error(`   ✗ Error listing users: ${error.message}`);
      return [];
    }
    
    const users = data?.users || [];
    if (users.length === 0) {
      console.log("   ℹ️  No users found in system");
    } else {
      console.log(`   Found ${users.length} user(s):`);
      users.forEach(user => {
        console.log(`   - ${user.email} (created: ${new Date(user.created_at).toLocaleDateString()})`);
      });
    }
    
    return users;
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
    return [];
  }
}

async function createTestUser() {
  console.log("\n4️⃣  Creating test user...");
  try {
    // First check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === testEmail);
    
    if (userExists) {
      console.log(`   ✓ Test user already exists: ${testEmail}`);
      console.log(`   📝 Credentials:`);
      console.log(`      Email: ${testEmail}`);
      console.log(`      Password: ${testPassword}`);
      return true;
    }
    
    // Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
    });
    
    if (error) {
      console.error(`   ✗ Failed to create user: ${error.message}`);
      return false;
    }
    
    console.log(`   ✓ Test user created successfully!`);
    console.log(`   📝 Test Credentials:`);
    console.log(`      Email: ${testEmail}`);
    console.log(`      Password: ${testPassword}`);
    console.log(`      User ID: ${data.user?.id}`);
    return true;
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
    return false;
  }
}

async function testSignIn() {
  console.log("\n5️⃣  Testing sign-in with test user...");
  try {
    // Create a new client with anon key for testing
    const anonKey = 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON || 
      process.env.SUPABASE_ANON;
    
    if (!anonKey) {
      console.warn("   ⚠️  Anon key not configured, skipping sign-in test");
      return false;
    }
    
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.error(`   ✗ Sign-in failed: ${error.message}`);
      return false;
    }
    
    console.log(`   ✓ Sign-in successful!`);
    console.log(`   Session token: ${data.session?.access_token?.slice(0, 20)}...`);
    return true;
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  try {
    const connected = await verifyConnection();
    
    if (!connected) {
      console.log("\n❌ Failed to connect to Supabase");
      console.log("   Please verify your environment variables and Supabase project");
      process.exit(1);
    }
    
    await listExistingUsers();
    await createTestUser();
    const signInWorks = await testSignIn();
    
    console.log("\n" + "=".repeat(50));
    if (signInWorks) {
      console.log("\n✅ Authentication setup is working correctly!");
      console.log("\n📖 Next steps:");
      console.log("   1. Use the test credentials to sign in:");
      console.log(`      Email: ${testEmail}`);
      console.log(`      Password: ${testPassword}`);
      console.log("   2. Check the browser console for detailed auth logs");
      console.log("   3. If you still see errors, check:");
      console.log("      - Supabase project settings");
      console.log("      - Email confirmation settings");
      console.log("      - CORS configuration\n");
    } else {
      console.log("\n⚠️  Authentication verification incomplete");
      console.log("   Test user was created, but sign-in test failed");
      console.log("   This might be a CORS or configuration issue\n");
    }
    
  } catch (err) {
    console.error("\n❌ Unexpected error:", err.message);
    process.exit(1);
  }
}

main();
