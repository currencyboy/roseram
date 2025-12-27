import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side health check endpoint
 * Checks if a deployment URL is accessible
 * Avoids CORS issues by making the request from the server
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'url parameter is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Make server-side fetch to avoid CORS issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => {
        // Fallback to GET if HEAD fails
        return fetch(url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Builder-Health-Check/1.0'
          }
        });
      });

      clearTimeout(timeoutId);

      // Any 2xx or 3xx response is considered healthy
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return NextResponse.json({
          success: true,
          healthy: true,
          status: response.status,
          url,
        });
      }

      // 5xx errors mean server is down
      if (response.status >= 500) {
        return NextResponse.json({
          success: true,
          healthy: false,
          status: response.status,
          url,
          reason: `Server error: ${response.status}`,
        });
      }

      // Other 4xx errors (not found, etc.)
      return NextResponse.json({
        success: true,
        healthy: true, // Server is up, just not this endpoint
        status: response.status,
        url,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Network errors, timeouts, etc.
      return NextResponse.json({
        success: true,
        healthy: false,
        error: fetchError.name === 'AbortError' ? 'timeout' : 'connection_failed',
        message: fetchError.message,
        url,
      });
    }
  } catch (error) {
    console.error('[HealthCheck] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
