import { NextResponse } from 'next/server';
import { logger } from '@/lib/errors';

/**
 * Preview Config API - Server-side settings configuration
 * No authentication required - settings are stored server-side
 * 
 * GET: Retrieve current preview configuration
 * POST: Update preview configuration
 */

// In-memory store for preview config (in production, use database)
let previewConfig = {
  enableInstantBoot: true,
  bootTimeout: 60000, // 60 seconds
  machineSize: 'shared-cpu-2x',
  autoScale: true,
  enableLogging: true,
  previewPort: 3000,
  maxConcurrentPreviews: 10,
  skipAuthenticationCheck: true,
  enableDirectBrowser: true,
};

export async function GET(request) {
  try {
    logger.info('Preview config requested');
    
    return NextResponse.json({
      success: true,
      config: previewConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get preview config', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to retrieve preview config' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const updates = await request.json();
    
    logger.info('Preview config update requested', { updates: Object.keys(updates) });

    // Validate and merge updates
    const allowedKeys = [
      'enableInstantBoot',
      'bootTimeout',
      'machineSize',
      'autoScale',
      'enableLogging',
      'previewPort',
      'maxConcurrentPreviews',
      'skipAuthenticationCheck',
      'enableDirectBrowser',
    ];

    const validUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedKeys.includes(key)) {
        validUpdates[key] = value;
      } else {
        logger.warn('Ignoring invalid config key', { key });
      }
    }

    // Apply updates
    previewConfig = {
      ...previewConfig,
      ...validUpdates,
    };

    logger.info('Preview config updated successfully', { 
      changes: Object.keys(validUpdates),
      newConfig: previewConfig 
    });

    return NextResponse.json({
      success: true,
      config: previewConfig,
      updated: Object.keys(validUpdates),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update preview config', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to update preview config' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
