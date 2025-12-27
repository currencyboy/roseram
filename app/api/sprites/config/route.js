import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';

/**
 * GET /api/sprites/config
 * Fetch sprite configuration and all required data endpoints
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const configName = searchParams.get('name') || 'default';
    const includeEndpoints = searchParams.get('includeEndpoints') !== 'false';
    const includeHealth = searchParams.get('includeHealth') !== 'false';

    if (!supabaseServer) {
      throw new Error('Supabase not configured');
    }

    // Fetch main configuration
    const { data: config, error: configError } = await supabaseServer
      .from('sprites_config')
      .select('*')
      .eq('name', configName)
      .eq('enabled', true)
      .single();

    if (configError || !config) {
      logger.warn('[SpritesConfig] Configuration not found', { configName, error: configError?.message });
      return NextResponse.json(
        { error: 'Sprite configuration not found', configName },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      config: {
        id: config.id,
        name: config.name,
        enabled: config.enabled,
        apiBaseUrl: config.api_base_url,
        apiTimeout: config.api_timeout_ms,
        defaultResources: {
          ramMb: config.default_ram_mb,
          cpus: config.default_cpus,
          region: config.default_region,
        },
        devServer: {
          packageManager: config.default_package_manager,
          scriptName: config.default_script_name,
          portDetectionTimeout: config.port_detection_timeout_ms,
          portDetectionPatterns: config.port_detection_patterns,
        },
        previewUrlTemplate: config.preview_url_template,
      },
    };

    // Fetch associated data endpoints if requested
    if (includeEndpoints) {
      const { data: endpoints, error: endpointsError } = await supabaseServer
        .from('sprite_config_mappings')
        .select(`
          id,
          purpose,
          is_required,
          is_primary,
          order_index,
          override_url,
          override_method,
          override_headers,
          override_query_params,
          data_endpoints (
            id,
            name,
            endpoint_key,
            url,
            method,
            auth_type,
            auth_header_name,
            headers,
            query_params,
            response_format,
            category,
            service_name
          )
        `)
        .eq('sprites_config_id', config.id)
        .order('order_index', { ascending: true });

      if (!endpointsError && endpoints) {
        // Group endpoints by purpose
        const groupedEndpoints = {};
        endpoints.forEach((mapping) => {
          const purpose = mapping.purpose || 'general';
          if (!groupedEndpoints[purpose]) {
            groupedEndpoints[purpose] = [];
          }
          const endpoint = mapping.data_endpoints;
          groupedEndpoints[purpose].push({
            id: endpoint.id,
            name: endpoint.name,
            key: endpoint.endpoint_key,
            url: mapping.override_url || endpoint.url,
            method: mapping.override_method || endpoint.method,
            authType: endpoint.auth_type,
            authHeaderName: endpoint.auth_header_name,
            headers: { ...endpoint.headers, ...mapping.override_headers },
            queryParams: { ...endpoint.query_params, ...mapping.override_query_params },
            responseFormat: endpoint.response_format,
            category: endpoint.category,
            serviceName: endpoint.service_name,
            isRequired: mapping.is_required,
            isPrimary: mapping.is_primary,
          });
        });
        response.endpoints = groupedEndpoints;
      }
    }

    // Fetch health check status if requested
    if (includeHealth && response.endpoints) {
      const { data: healthChecks, error: healthError } = await supabaseServer
        .from('endpoint_health_checks')
        .select('data_endpoint_id, status, response_time_ms, last_checked_at')
        .order('last_checked_at', { ascending: false })
        .limit(1);

      if (!healthError && healthChecks) {
        const healthMap = {};
        healthChecks.forEach((check) => {
          healthMap[check.data_endpoint_id] = {
            status: check.status,
            responseTime: check.response_time_ms,
            lastChecked: check.last_checked_at,
          };
        });
        response.health = healthMap;
      }
    }

    logger.info('[SpritesConfig] Configuration fetched', {
      configName,
      configId: config.id,
      endpointCount: response.endpoints ? Object.keys(response.endpoints).length : 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[SpritesConfig] Failed to fetch configuration', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sprite configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sprites/config
 * Create or update sprite configuration (Admin only)
 */
export async function POST(request) {
  try {
    const user = await supabaseServer.auth.getUser();
    
    // Check if admin
    if (!user.data?.user?.email?.includes('2notice@venezuela.com')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      enabled = true,
      apiBaseUrl = 'https://api.sprites.dev',
      apiTimeout = 30000,
      defaultResources = {},
      devServer = {},
      previewUrlTemplate = 'https://{sprite_name}.sprites.dev',
      description,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Configuration name is required' },
        { status: 400 }
      );
    }

    const { data: config, error } = await supabaseServer
      .from('sprites_config')
      .upsert({
        name,
        enabled,
        api_base_url: apiBaseUrl,
        api_timeout_ms: apiTimeout,
        default_ram_mb: defaultResources.ramMb || 1024,
        default_cpus: defaultResources.cpus || 2,
        default_region: defaultResources.region || 'ord',
        default_package_manager: devServer.packageManager || 'npm',
        default_script_name: devServer.scriptName || 'dev',
        port_detection_timeout_ms: devServer.portDetectionTimeout || 300000,
        port_detection_patterns: devServer.portDetectionPatterns || [],
        preview_url_template: previewUrlTemplate,
        description,
      }, {
        onConflict: 'name',
        returning: 'representation',
      })
      .select()
      .single();

    if (error) {
      logger.error('[SpritesConfig] Failed to create/update configuration', { error: error.message });
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    logger.info('[SpritesConfig] Configuration created/updated', { name: config.name, configId: config.id });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    logger.error('[SpritesConfig] POST failed', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to create/update configuration' },
      { status: 500 }
    );
  }
}
