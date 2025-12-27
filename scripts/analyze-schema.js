#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_SERVICE_ROLE = process.env.NEXT_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const urlObj = new URL(SUPABASE_URL);
const projectRef = urlObj.hostname.split('.')[0];

// Tables used in the codebase
const TABLES_IN_USE = new Set([
  'projects',
  'chat_messages',
  'deployments',
  'action_logs',
  'user_integrations',
  'user_env_vars',
  'user_sessions',
  'api_usage_logs',
  'solana_payments',
  'organizations',
  'organization_members',
  'integrations',
  'activity_logs',
  'sites',
  'user_preferences',
  'actions',
  'code_versions',
  'history_snapshots',
  'user_ai_usage',
]);

async function analyzeSchema() {
  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SUPABASE_SERVICE_ROLE,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Schema Analysis Report                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    console.log('📊 Current Tables in Database:\n');
    const tables = tablesResult.rows.map(row => row.tablename);
    
    let totalSize = 0;
    for (const row of tablesResult.rows) {
      const isUsed = TABLES_IN_USE.has(row.tablename);
      const indicator = isUsed ? '✓' : '⚠';
      console.log(`  ${indicator} ${row.tablename.padEnd(30)} ${row.size.padStart(10)}`);
      if (isUsed) console.log('     └─ In use');
      else console.log('     └─ NOT USED - candidate for removal');
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Get unused tables
    const unusedTables = tables.filter(t => !TABLES_IN_USE.has(t) && t !== 'schema_migrations');
    console.log(`📌 Unused Tables (${unusedTables.length}):\n`);
    if (unusedTables.length > 0) {
      unusedTables.forEach(table => console.log(`  - ${table}`));
    } else {
      console.log('  None found!');
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Analyze columns for each used table
    console.log('📋 Detailed Column Analysis:\n');
    
    for (const table of Array.from(TABLES_IN_USE).sort()) {
      if (!tables.includes(table)) continue;

      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      console.log(`\n📦 Table: ${table}`);
      console.log('   Columns:');
      
      for (const col of columnsResult.rows) {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const hasDefault = col.column_default ? ` = ${col.column_default}` : '';
        console.log(`     - ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${nullable}${hasDefault}`);
      }
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Analyze foreign keys
    console.log('🔗 Foreign Key Relationships:\n');
    
    const fkResult = await client.query(`
      SELECT
        constraint_name,
        table_name,
        column_name,
        foreign_table_name,
        foreign_column_name
      FROM information_schema.key_column_usage
      WHERE table_schema = 'public'
        AND foreign_table_name IS NOT NULL
      ORDER BY table_name, constraint_name
    `);

    if (fkResult.rows.length > 0) {
      const fksByTable = {};
      for (const fk of fkResult.rows) {
        if (!fksByTable[fk.table_name]) {
          fksByTable[fk.table_name] = [];
        }
        fksByTable[fk.table_name].push(fk);
      }

      for (const [tableName, fks] of Object.entries(fksByTable)) {
        const tableExists = TABLES_IN_USE.has(tableName);
        const indicator = tableExists ? '✓' : '❌';
        console.log(`\n  ${indicator} ${tableName}:`);
        
        for (const fk of fks) {
          const refTableExists = TABLES_IN_USE.has(fk.foreign_table_name);
          const refIndicator = refTableExists ? '✓' : '❌';
          console.log(`     - ${fk.column_name} → ${refIndicator} ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        }
      }
    } else {
      console.log('  No foreign keys found');
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Check for constraint issues
    console.log('🔍 Constraint Analysis:\n');
    
    const constraintsResult = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK')
      ORDER BY tc.table_name, tc.constraint_type
    `);

    const constraintsByTable = {};
    for (const constraint of constraintsResult.rows) {
      if (!constraintsByTable[constraint.table_name]) {
        constraintsByTable[constraint.table_name] = [];
      }
      constraintsByTable[constraint.table_name].push(constraint);
    }

    for (const [tableName, constraints] of Object.entries(constraintsByTable)) {
      const indicator = TABLES_IN_USE.has(tableName) ? '✓' : '⚠';
      console.log(`\n  ${indicator} ${tableName}:`);
      
      for (const constraint of constraints) {
        const column = constraint.column_name || '(combined)';
        console.log(`     - ${constraint.constraint_type}: ${constraint.constraint_name} (${column})`);
      }
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Generate cleanup recommendations
    console.log('🛠️  Cleanup Recommendations:\n');

    if (unusedTables.length > 0) {
      console.log(`  1. Drop ${unusedTables.length} unused table(s):`);
      unusedTables.forEach(table => {
        console.log(`     DROP TABLE IF EXISTS public.${table} CASCADE;`);
      });
    }

    console.log('\n  2. Review and remove unused columns from tables in use');
    console.log('  3. Check for duplicate or conflicting constraints');
    console.log('  4. Verify all foreign key relationships are valid\n');

    console.log('💡 Next Steps:\n');
    console.log('  1. Run: npm run schema:cleanup');
    console.log('  2. Review changes in Supabase dashboard');
    console.log('  3. Test application functionality\n');

    await client.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('  - PostgreSQL client library is installed: npm install pg');
    console.error('  - Supabase credentials are correct');
    console.error('  - Database is accessible from your network\n');
    process.exit(1);
  }
}

analyzeSchema();
