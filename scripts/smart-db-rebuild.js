#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_SERVICE_ROLE = process.env.NEXT_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Roseram Builder - Smart Database Schema Rebuild          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function makePostgresRequest(sql) {
  return new Promise((resolve, reject) => {
    const hostname = `${projectRef}.supabase.co`;
    const path = '/rest/v1/rpc/sql_run';

    const options = {
      hostname,
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'apikey': SUPABASE_SERVICE_ROLE,
      },
    };

    const body = JSON.stringify({ sql });

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            resolve({ error: result.message || data, statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ error: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Execute via direct PostgreSQL wire protocol
async function executeDirect() {
  console.log('📡 Attempting direct PostgreSQL execution...\n');

  try {
    const { Client } = require('pg');

    const client = new Client({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SUPABASE_SERVICE_ROLE,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
    });

    await client.connect();
    console.log('✓ Connected to PostgreSQL\n');

    const sqlFile = path.join(__dirname, '..', 'temp_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    console.log('📝 Executing schema...\n');
    await client.query(sql);

    console.log('✅ Schema executed successfully!\n');
    console.log('📌 Database rebuilt with:');
    console.log('   ✓ All tables (organizations, sites, pages, projects, etc.)');
    console.log('   ✓ Missing slug columns');
    console.log('   ✓ Foreign keys and constraints');
    console.log('   ✓ Indexes for performance');
    console.log('   ✓ RLS policies for security\n');

    console.log('🚀 Your database is ready!');
    console.log('   1. Restart your dev server: npm run dev');
    console.log('   2. Try creating a site or page');
    console.log('   3. The slug error should be fixed\n');

    await client.end();
    process.exit(0);

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  pg module not found. Installing...\n');
      const { execSync } = require('child_process');
      try {
        execSync('npm install pg', { 
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        console.log('✓ pg installed\n');
        // Retry
        return executeDirect();
      } catch (e) {
        console.error('Failed to install pg:', e.message);
        throw e;
      }
    } else {
      throw error;
    }
  }
}

async function executeViaCurl() {
  console.log('📡 Attempting execution via HTTP API...\n');

  const sqlFile = path.join(__dirname, '..', 'temp_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  // Try to execute the full schema as one statement
  console.log('📝 Sending schema to database...\n');

  const hostname = `${projectRef}.supabase.co`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'apikey': SUPABASE_SERVICE_ROLE,
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✓ Connected to Supabase API\n');

        // Check if we can run SQL via REST
        if (res.headers['x-rls-enabled']) {
          console.log('ℹ️  RLS is enabled on this database');
        }

        resolve(true);
      } else {
        reject(new Error(`API error: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    // Try direct PostgreSQL first
    await executeDirect();

  } catch (error) {
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.error('❌ Cannot connect to PostgreSQL');
      console.error('   The database host is not accessible from this environment\n');
      showFallbackInstructions();
      process.exit(1);

    } else if (error.message && (error.message.includes('authentication') || error.message.includes('password'))) {
      console.error('❌ Authentication failed');
      console.error('   The service role key may not have database access\n');
      showFallbackInstructions();
      process.exit(1);

    } else {
      console.error('❌ Error:', error.message, '\n');
      showFallbackInstructions();
      process.exit(1);
    }
  }
}

function showFallbackInstructions() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Manual Execution (Browser-Based)                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Since your environment has restrictions, please execute manually:\n');

  console.log('📌 Step 1: Open Supabase Dashboard');
  console.log(`   https://app.supabase.com/project/${projectRef}/sql\n`);

  console.log('📌 Step 2: Create New Query');
  console.log('   - Click the "New Query" button (blue, top-left)\n');

  console.log('📌 Step 3: Copy SQL Content');
  console.log('   - Open this file: temp_schema.sql');
  console.log('   - Copy all the content\n');

  console.log('📌 Step 4: Paste and Execute');
  console.log('   - Paste into the SQL editor');
  console.log('   - Click the "RUN" button\n');

  console.log('✅ Once complete, your database will be fully set up!\n');
}

main();
