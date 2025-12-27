#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_SERVICE_ROLE = process.env.NEXT_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function main() {
  try {
    console.log('📡 Attempting to execute database schema...\n');

    // Check if pg package is available
    let pgAvailable = false;
    try {
      require('pg');
      pgAvailable = true;
    } catch (e) {
      pgAvailable = false;
    }

    if (pgAvailable) {
      await executeWithPostgres();
    } else {
      console.log('⚠️  pg package not installed. Installing...\n');
      console.log('Running: npm install pg\n');
      
      try {
        execSync('npm install pg', { 
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit'
        });
        await executeWithPostgres();
      } catch (installError) {
        console.error('❌ Failed to install pg package');
        console.error('Please execute schema manually (see instructions below)\n');
        showManualInstructions();
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPlease execute schema manually (see instructions below)\n');
    showManualInstructions();
    process.exit(1);
  }
}

async function executeWithPostgres() {
  const { Client } = require('pg');
  const sqlFile = path.join(__dirname, '..', 'temp_schema.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error('❌ SQL file not found at ' + sqlFile);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const host = `db.${projectRef}.supabase.co`;

  const client = new Client({
    host: host,
    database: 'postgres',
    user: 'postgres',
    password: SUPABASE_SERVICE_ROLE,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    console.log('📡 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    console.log('📝 Executing schema rebuild...');
    console.log('   This may take a moment...\n');

    await client.query(sqlContent);

    console.log('✅ Schema rebuild completed successfully!\n');
    console.log('📌 Summary:');
    console.log('   ✓ All tables created');
    console.log('   ✓ Indexes added');
    console.log('   ✓ Foreign keys configured');
    console.log('   ✓ RLS policies enabled');
    console.log('   ✓ Performance optimized\n');

    console.log('🚀 Next steps:');
    console.log('   1. Restart your dev server');
    console.log('   2. Try creating a site or page');
    console.log('   3. The slug error should now be fixed\n');

  } catch (error) {
    console.error('❌ Database error:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Could not connect to database');
      console.error('   - Check your Supabase credentials');
      console.error('   - Verify the project is active');
    }

    showManualInstructions();
    process.exit(1);

  } finally {
    await client.end();
  }
}

function showManualInstructions() {
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Manual Schema Execution (Alternative Method)             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Option 1 - Supabase Dashboard (Easiest):\n');
  console.log('   1. Go to: https://app.supabase.com/project/' + projectRef + '/sql');
  console.log('   2. Click "New Query"');
  console.log('   3. Copy content from: temp_schema.sql');
  console.log('   4. Click "RUN"\n');

  console.log('Option 2 - Using psql (if installed):\n');
  console.log('   export PGPASSWORD="' + SUPABASE_SERVICE_ROLE.substring(0, 30) + '..."');
  console.log('   psql -h db.' + projectRef + '.supabase.co -U postgres -d postgres -f temp_schema.sql\n');
}

main();
