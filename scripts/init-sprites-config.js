#!/usr/bin/env node

/**
 * Initialize Sprites.dev configuration in Supabase
 * Run this script to set up the default sprite configuration and data endpoints
 * 
 * Usage: node scripts/init-sprites-config.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   NEXT_PUBLIC_SUPABASE_PROJECT_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeConfig() {
  try {
    console.log('🚀 Initializing Sprites.dev configuration...\n');

    // 1. Insert default Sprites configuration
    console.log('1️⃣  Setting up default Sprites configuration...');
    const { data: config, error: configError } = await supabase
      .from('sprites_config')
      .upsert({
        name: 'default',
        enabled: true,
        api_base_url: 'https://api.sprites.dev',
        api_timeout_ms: 30000,
        default_ram_mb: 1024,
        default_cpus: 2,
        default_region: 'ord',
        default_package_manager: 'npm',
        default_script_name: 'dev',
        port_detection_timeout_ms: 300000,
        port_detection_patterns: [
          '(?:listening|listening on|Local:.*?:)(\\d{4,5})',
          'http://localhost:(\\d{4,5})',
          'Port (\\d{4,5})',
          ':(\\d{4,5})/',
          '\\*\\*\\*\\s*(\\d{4,5})\\s*\\*\\*\\*',
          'http.*?(\\d{4,5})',
        ],
        preview_url_template: 'https://{sprite_name}.sprites.dev',
        description: 'Default Sprites.dev configuration for preview instances',
      }, {
        onConflict: 'name',
        returning: 'representation',
      })
      .select()
      .single();

    if (configError) {
      throw new Error(`Failed to create sprites config: ${configError.message}`);
    }

    console.log('   ✅ Default configuration created');
    console.log(`   📋 Config ID: ${config.id}\n`);

    // 2. Insert data endpoints
    console.log('2️⃣  Setting up data endpoints...');
    
    const endpoints = [
      {
        name: 'Sprites List',
        endpoint_key: 'sprites.list',
        url: 'https://api.sprites.dev/sprites',
        method: 'GET',
        category: 'preview',
        service_name: 'sprites',
        description: 'List all active sprites',
      },
      {
        name: 'Sprites Create',
        endpoint_key: 'sprites.create',
        url: 'https://api.sprites.dev/sprites',
        method: 'POST',
        category: 'preview',
        service_name: 'sprites',
        description: 'Create a new sprite instance',
      },
      {
        name: 'Sprites Status',
        endpoint_key: 'sprites.status',
        url: 'https://api.sprites.dev/sprites/{sprite_id}',
        method: 'GET',
        category: 'preview',
        service_name: 'sprites',
        description: 'Get sprite status and information',
      },
      {
        name: 'Sprites Delete',
        endpoint_key: 'sprites.delete',
        url: 'https://api.sprites.dev/sprites/{sprite_id}',
        method: 'DELETE',
        category: 'preview',
        service_name: 'sprites',
        description: 'Delete a sprite instance',
      },
      {
        name: 'Sprites Port Detection',
        endpoint_key: 'sprites.port-detect',
        url: 'https://api.sprites.dev/sprites/{sprite_id}/ports',
        method: 'GET',
        category: 'preview',
        service_name: 'sprites',
        description: 'Detect opened ports in sprite',
      },
      {
        name: 'GitHub Repositories',
        endpoint_key: 'github.repositories',
        url: 'https://api.github.com/user/repos',
        method: 'GET',
        auth_type: 'bearer',
        auth_header_name: 'Authorization',
        category: 'configuration',
        service_name: 'github',
        description: 'List GitHub repositories for authenticated user',
      },
      {
        name: 'GitHub Branches',
        endpoint_key: 'github.branches',
        url: 'https://api.github.com/repos/{owner}/{repo}/branches',
        method: 'GET',
        auth_type: 'bearer',
        auth_header_name: 'Authorization',
        category: 'configuration',
        service_name: 'github',
        description: 'List branches in a GitHub repository',
      },
      {
        name: 'Supabase Projects',
        endpoint_key: 'supabase.projects',
        url: 'https://api.supabase.com/v1/projects',
        method: 'GET',
        auth_type: 'bearer',
        category: 'configuration',
        service_name: 'supabase',
        description: 'List Supabase projects',
      },
      {
        name: 'Netlify Sites',
        endpoint_key: 'netlify.sites',
        url: 'https://api.netlify.com/api/v1/sites',
        method: 'GET',
        auth_type: 'bearer',
        category: 'configuration',
        service_name: 'netlify',
        description: 'List Netlify sites',
      },
    ];

    const createdEndpoints = [];
    for (const endpoint of endpoints) {
      const { data: created, error: endpointError } = await supabase
        .from('data_endpoints')
        .upsert(endpoint, {
          onConflict: 'endpoint_key',
          returning: 'representation',
        })
        .select()
        .single();

      if (endpointError) {
        console.warn(`   ⚠️  Failed to create endpoint ${endpoint.endpoint_key}: ${endpointError.message}`);
      } else {
        createdEndpoints.push(created);
        console.log(`   ✅ ${endpoint.name}`);
      }
    }

    console.log(`   📊 Created ${createdEndpoints.length} endpoints\n`);

    // 3. Create mappings
    console.log('3️⃣  Setting up configuration mappings...');
    
    const mappings = [
      {
        purpose: 'provisioning',
        endpoint_key: 'sprites.create',
        is_required: true,
        is_primary: true,
        order_index: 1,
      },
      {
        purpose: 'status',
        endpoint_key: 'sprites.status',
        is_required: true,
        is_primary: true,
        order_index: 2,
      },
      {
        purpose: 'port-detection',
        endpoint_key: 'sprites.port-detect',
        is_required: true,
        is_primary: true,
        order_index: 3,
      },
      {
        purpose: 'cleanup',
        endpoint_key: 'sprites.delete',
        is_required: false,
        is_primary: true,
        order_index: 4,
      },
      {
        purpose: 'github-integration',
        endpoint_key: 'github.repositories',
        is_required: false,
        order_index: 5,
      },
      {
        purpose: 'github-integration',
        endpoint_key: 'github.branches',
        is_required: false,
        order_index: 6,
      },
    ];

    let mappingCount = 0;
    for (const mapping of mappings) {
      const endpoint = createdEndpoints.find(e => e.endpoint_key === mapping.endpoint_key);
      if (!endpoint) {
        console.warn(`   ⚠️  Endpoint not found: ${mapping.endpoint_key}`);
        continue;
      }

      const { error: mappingError } = await supabase
        .from('sprite_config_mappings')
        .upsert({
          sprites_config_id: config.id,
          data_endpoint_id: endpoint.id,
          ...mapping,
        }, {
          onConflict: 'sprites_config_id,data_endpoint_id,purpose',
          returning: 'representation',
        });

      if (mappingError && !mappingError.message.includes('duplicate')) {
        console.warn(`   ⚠️  Failed to create mapping for ${mapping.endpoint_key}: ${mappingError.message}`);
      } else {
        mappingCount++;
        console.log(`   ✅ Mapped: ${mapping.purpose} -> ${mapping.endpoint_key}`);
      }
    }

    console.log(`   📌 Created ${mappingCount} mappings\n`);

    // 4. Verify setup
    console.log('4️⃣  Verifying configuration...');
    const { count: configCount } = await supabase
      .from('sprites_config')
      .select('id', { count: 'exact' })
      .eq('enabled', true);

    const { count: endpointCount } = await supabase
      .from('data_endpoints')
      .select('id', { count: 'exact' })
      .eq('enabled', true);

    console.log(`   ✅ Active configurations: ${configCount}`);
    console.log(`   ✅ Active endpoints: ${endpointCount}\n`);

    console.log('✨ Sprites.dev configuration initialized successfully!');
    console.log('   You can now use the Sprites preview feature with dynamic configuration.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing configuration:', error.message);
    process.exit(1);
  }
}

initializeConfig();
