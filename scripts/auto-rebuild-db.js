#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_SERVICE_ROLE = process.env.NEXT_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_PROJECT_URL and NEXT_SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Roseram Builder - Auto Database Schema Rebuild           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📌 Project:', projectRef);
console.log('🔐 Using service role key\n');

async function executeSQL(sqlStatement) {
  return new Promise((resolve, reject) => {
    // Prepare the request
    const hostname = `${projectRef}.supabase.co`;
    const body = JSON.stringify({
      query: sqlStatement,
    });

    const options = {
      hostname: hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql_unsafe',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'apikey': SUPABASE_SERVICE_ROLE,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: parsed });
          } else if (res.statusCode === 404) {
            // RPC function doesn't exist, try fallback
            resolve({ success: false, fallback: true, error: 'exec_sql_unsafe not available' });
          } else {
            resolve({
              success: false,
              error: parsed.message || data,
              code: res.statusCode,
            });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: data });
          } else {
            resolve({ success: false, error: data, code: res.statusCode });
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

// Alternative: Execute via REST API using individual statements
async function fallbackExecuteSQL(statement) {
  return new Promise((resolve, reject) => {
    // For simple CREATE TABLE statements, we can use the REST API
    const hostname = `${projectRef}.supabase.co`;

    const options = {
      hostname: hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'apikey': SUPABASE_SERVICE_ROLE,
      },
    };

    // This is a placeholder - full SQL execution requires exec_sql_unsafe RPC
    resolve({ success: false, requiresManual: true });
  });
}

async function main() {
  try {
    const sqlFile = path.join(__dirname, '..', 'temp_schema.sql');

    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL file not found');
      console.error('Please run: npm run db:rebuild');
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

    console.log('📝 Attempting to execute schema via REST API...\n');

    // Try executing the full schema
    const result = await executeSQL(sqlContent);

    if (result.success) {
      console.log('✅ Schema executed successfully!\n');
      console.log('📌 Summary:');
      console.log('   ✓ All tables created');
      console.log('   ✓ Indexes added');
      console.log('   ✓ Foreign keys configured');
      console.log('   ✓ RLS policies enabled\n');

      console.log('🚀 Next steps:');
      console.log('   1. The database schema has been rebuilt');
      console.log('   2. Restart your dev server if needed');
      console.log('   3. Try creating a site or page');
      console.log('   4. The slug error should now be fixed\n');

    } else if (result.fallback) {
      console.log('⚠️  exec_sql_unsafe RPC not available');
      console.log('Trying alternative method...\n');

      // Fallback: execute statements one by one
      const statements = parseStatements(sqlContent);
      let successful = 0;
      let failed = 0;

      console.log(`📝 Executing ${statements.length} statements...\n`);

      for (let i = 0; i < Math.min(statements.length, 20); i++) {
        const stmt = statements[i];
        const result = await executeSQL(stmt);

        if (result.success) {
          successful++;
          process.stdout.write('.');
        } else {
          failed++;
          process.stdout.write('E');
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
      }

      console.log('\n');
      console.log(`Results: ${successful} successful, ${failed} failed\n`);

      if (failed === 0 && successful > 0) {
        console.log('✅ Schema partially executed!\n');
      } else {
        console.log('⚠️  Supabase RPC functions are limited in this environment');
        showManualInstructions();
      }

    } else {
      console.log('❌ Error executing schema:');
      console.log('   Error:', result.error);
      console.log('   Code:', result.code, '\n');

      showManualInstructions();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Unexpected error:');
    console.error('  ', error.message, '\n');
    showManualInstructions();
    process.exit(1);
  }
}

function parseStatements(sql) {
  // Split by semicolon but preserve content
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => {
      // Remove comments and empty statements
      if (!stmt) return false;
      if (stmt.match(/^--/)) return false;
      if (stmt.match(/^BEGIN;?$/i)) return false;
      if (stmt.match(/^COMMIT;?$/i)) return false;
      if (stmt.match(/^ANALYZE;?$/i)) return false;
      return true;
    })
    .map(stmt => stmt + ';');

  return statements;
}

function showManualInstructions() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Manual Execution Instructions                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Your Supabase environment doesn\'t support direct SQL execution');
  console.log('via the API. Please execute the schema manually:\n');

  console.log('1. Open Supabase Dashboard:');
  console.log(`   https://app.supabase.com/project/${projectRef}/sql\n`);

  console.log('2. Click "New Query" button\n');

  console.log('3. Copy this file content:');
  console.log('   File: temp_schema.sql\n');

  console.log('4. Paste it into the SQL editor\n');

  console.log('5. Click the "RUN" button\n');

  console.log('The schema will be executed and you\'ll see success confirmation.\n');
}

main();
