import { NextResponse } from 'next/server';
import { logger } from '@/lib/errors';
import { isFlyIOConfigured, getDeploymentStatus } from '@/lib/flyio-deployment';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'all';

    const diagnostics = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Test 1: Fly.io Configuration
    if (testType === 'all' || testType === 'config') {
      const flyConfigured = isFlyIOConfigured();
      diagnostics.tests.flyIOConfig = {
        name: 'Fly.io Configuration',
        passed: flyConfigured,
        message: flyConfigured
          ? 'Fly.io API token is configured'
          : 'Fly.io API token is NOT configured - set FLY_IO_TOKEN environment variable',
      };
    }

    // Test 2: Supabase Configuration
    if (testType === 'all' || testType === 'database') {
      const supabaseConfigured = !!supabaseServer;
      diagnostics.tests.supabaseConfig = {
        name: 'Supabase Configuration',
        passed: supabaseConfigured,
        message: supabaseConfigured
          ? 'Supabase is configured'
          : 'Supabase is NOT configured',
      };
    }

    // Test 3: Check existing preview apps
    if (testType === 'all' || testType === 'apps') {
      try {
        const { data: apps, error } = await supabaseServer
          .from('fly_preview_apps')
          .select('id, fly_app_name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          diagnostics.tests.previewApps = {
            name: 'Preview Apps Database',
            passed: false,
            message: `Error querying preview apps: ${error.message}`,
          };
        } else {
          diagnostics.tests.previewApps = {
            name: 'Preview Apps Database',
            passed: true,
            message: `Found ${apps?.length || 0} preview apps`,
            apps: apps?.map(app => ({
              id: app.id,
              name: app.fly_app_name,
              status: app.status,
              createdAt: app.created_at,
            })) || [],
          };
        }
      } catch (error) {
        diagnostics.tests.previewApps = {
          name: 'Preview Apps Database',
          passed: false,
          message: `Error: ${error.message}`,
        };
      }
    }

    // Test 4: Check sample app status
    if (testType === 'all' || testType === 'status') {
      try {
        const { data: latestApp } = await supabaseServer
          .from('fly_preview_apps')
          .select('fly_app_name')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestApp?.fly_app_name && isFlyIOConfigured()) {
          const status = await getDeploymentStatus(latestApp.fly_app_name);
          diagnostics.tests.latestAppStatus = {
            name: `Latest App Status (${latestApp.fly_app_name})`,
            passed: !!status.appStatus,
            appStatus: status.appStatus,
            deploymentStatus: status.deploymentStatus,
            machineState: status.machineState,
            message: `App ${latestApp.fly_app_name} status check completed`,
            fullStatus: status,
          };
        }
      } catch (error) {
        diagnostics.tests.latestAppStatus = {
          name: 'Latest App Status',
          passed: false,
          message: `Error checking app status: ${error.message}`,
        };
      }
    }

    // Summary
    const allTests = Object.values(diagnostics.tests);
    const passedTests = allTests.filter(t => t.passed).length;
    diagnostics.summary = {
      totalTests: allTests.length,
      passed: passedTests,
      failed: allTests.length - passedTests,
      status: passedTests === allTests.length ? '✅ All systems operational' : `⚠️  ${allTests.length - passedTests} issue(s) detected`,
    };

    logger.info('Fly.io preview diagnostics', diagnostics);

    return NextResponse.json({
      success: true,
      ...diagnostics,
    });
  } catch (error) {
    logger.error('Preview diagnostic test failed', { error: error.message });
    return NextResponse.json(
      {
        success: false,
        error: 'Diagnostic test failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
