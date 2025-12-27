import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';

/**
 * GET /api/sprites/endpoints
 * Fetch all available data endpoints with optional filtering
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const serviceName = searchParams.get('service');
    const enabledOnly = searchParams.get('enabledOnly') !== 'false';
    const includeHealth = searchParams.get('includeHealth') !== 'false';

    if (!supabaseServer) {
      throw new Error('Supabase not configured');
    }

    // Build query
    let query = supabaseServer
      .from('data_endpoints')
      .select('*');

    if (enabledOnly) {
      query = query.eq('enabled', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (serviceName) {
      query = query.eq('service_name', serviceName);
    }

    const { data: endpoints, error: endpointsError } = await query.order('created_at', { ascending: false });

    if (endpointsError) {
      logger.error('[DataEndpoints] Failed to fetch endpoints', { error: endpointsError.message });
      return NextResponse.json(
        { error: endpointsError.message },
        { status: 500 }
      );
    }

    // Fetch health status if requested
    let healthMap = {};
    if (includeHealth && endpoints && endpoints.length > 0) {
      const endpointIds = endpoints.map(e => e.id);
      const { data: healthChecks } = await supabaseServer
        .from('endpoint_health_checks')
        .select('data_endpoint_id, status, response_time_ms, last_checked_at, error_message')
        .in('data_endpoint_id', endpointIds)
        .order('last_checked_at', { ascending: false });

      if (healthChecks) {
        healthChecks.forEach((check) => {
          if (!healthMap[check.data_endpoint_id]) {
            healthMap[check.data_endpoint_id] = check;
          }
        });
      }
    }

    const formattedEndpoints = endpoints.map((endpoint) => ({
      id: endpoint.id,
      name: endpoint.name,
      key: endpoint.endpoint_key,
      url: endpoint.url,
      method: endpoint.method,
      enabled: endpoint.enabled,
      authType: endpoint.auth_type,
      authHeaderName: endpoint.auth_header_name,
      headers: endpoint.headers,
      queryParams: endpoint.query_params,
      responseFormat: endpoint.response_format,
      category: endpoint.category,
      serviceName: endpoint.service_name,
      description: endpoint.description,
      documentationUrl: endpoint.documentation_url,
      cacheEnabled: endpoint.cache_enabled,
      cacheTtl: endpoint.cache_ttl_seconds,
      health: healthMap[endpoint.id],
    }));

    logger.info('[DataEndpoints] Endpoints fetched', { count: formattedEndpoints.length });

    return NextResponse.json({
      success: true,
      endpoints: formattedEndpoints,
      count: formattedEndpoints.length,
    });
  } catch (error) {
    logger.error('[DataEndpoints] GET failed', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch endpoints' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sprites/endpoints
 * Create a new data endpoint (Admin only)
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
      endpointKey,
      url,
      method = 'GET',
      enabled = true,
      authType = 'none',
      authHeaderName,
      authTokenRef,
      headers = {},
      queryParams = {},
      responseFormat = 'json',
      category = 'general',
      serviceName,
      description,
      documentationUrl,
      cacheEnabled = false,
      cacheTtl,
    } = body;

    if (!name || !endpointKey || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: name, endpointKey, url' },
        { status: 400 }
      );
    }

    const { data: endpoint, error } = await supabaseServer
      .from('data_endpoints')
      .insert({
        name,
        endpoint_key: endpointKey,
        url,
        method,
        enabled,
        auth_type: authType,
        auth_header_name: authHeaderName,
        auth_token_ref: authTokenRef,
        headers,
        query_params: queryParams,
        response_format: responseFormat,
        category,
        service_name: serviceName,
        description,
        documentation_url: documentationUrl,
        cache_enabled: cacheEnabled,
        cache_ttl_seconds: cacheTtl,
      })
      .select()
      .single();

    if (error) {
      logger.error('[DataEndpoints] Failed to create endpoint', { error: error.message });
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    logger.info('[DataEndpoints] Endpoint created', { name: endpoint.name, key: endpoint.endpoint_key });

    return NextResponse.json({
      success: true,
      endpoint,
    });
  } catch (error) {
    logger.error('[DataEndpoints] POST failed', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to create endpoint' },
      { status: 500 }
    );
  }
}
