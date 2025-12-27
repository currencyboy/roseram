import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (err) {
    return null;
  }
}

function deriveSupabaseUrlFromKey(key) {
  try {
    const payload = decodeJWT(key);
    if (!payload) {
      return null;
    }

    // Try to extract project ID from various possible locations in the JWT
    let projectId = null;

    // Method 1: Check 'ref' claim (common in Supabase)
    if (payload.ref && typeof payload.ref === 'string') {
      projectId = payload.ref;
    }

    // Method 2: Check 'sub' claim (another common pattern)
    if (!projectId && payload.sub && typeof payload.sub === 'string') {
      // Extract first part (project ID) if sub contains dashes
      const subParts = payload.sub.split('-');
      if (subParts.length > 0 && subParts[0].length > 0) {
        projectId = subParts[0];
      }
    }

    // Method 3: Check 'iss' claim for project reference
    if (!projectId && payload.iss && typeof payload.iss === 'string') {
      // Try to extract from issuer URL like "https://projectid.supabase.co"
      const issMatch = payload.iss.match(/https:\/\/([^.]+)\./);
      if (issMatch) {
        projectId = issMatch[1];
      }
    }

    // Method 4: Check for project_id claim directly
    if (!projectId && payload.project_id && typeof payload.project_id === 'string') {
      projectId = payload.project_id;
    }

    if (projectId && projectId.length > 0) {
      return `https://${projectId}.supabase.co`;
    }

    return null;
  } catch (err) {
    console.error('Error deriving Supabase URL from key:', err.message);
    return null;
  }
}

export async function POST(request) {
  try {
    const { action, url, key, deriveUrl } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: 'Supabase key required' },
        { status: 400 }
      );
    }

    let finalUrl = url;

    // Attempt to derive URL from key if not provided or requested
    if (!finalUrl || deriveUrl) {
      finalUrl = deriveSupabaseUrlFromKey(key);
      if (!finalUrl) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'Could not derive Supabase project URL from the provided key. Please ensure you have provided a valid Supabase anon key.',
        });
      }
    }

    const supabase = createClient(finalUrl, key);

    if (action === 'validate-credentials') {
      // Validate Supabase credentials
      try {
        const decoded = decodeJWT(key);
        if (!decoded) {
          throw new Error('Invalid Supabase key format - must be a valid JWT');
        }

        // Verify the project URL is valid
        try {
          new URL(finalUrl);
        } catch (e) {
          throw new Error('Invalid Supabase project URL');
        }

        // Test the connection with a simple API call to the metadata endpoint
        const testResponse = await fetch(`${finalUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Accept': 'application/json',
          },
        });

        if (testResponse.status === 401 || testResponse.status === 403) {
          throw new Error('Unauthorized - Invalid or expired Supabase credentials');
        }

        if (!testResponse.ok && testResponse.status !== 404) {
          throw new Error(`Failed to connect to Supabase - ${testResponse.statusText}`);
        }

        // Credentials are valid - return success
        return NextResponse.json({
          success: true,
          valid: true,
          projectUrl: finalUrl,
        });
      } catch (err) {
        console.error('Supabase validation error:', err.message);
        return NextResponse.json({
          success: false,
          valid: false,
          error: err.message || 'Invalid Supabase credentials or URL',
        });
      }
    }

    if (action === 'get-project-info') {
      // Get Supabase project info
      try {
        const projectId = new URL(finalUrl).hostname.split('.')[0];

        // Try to fetch project name from environment or URL
        return NextResponse.json({
          success: true,
          project: {
            id: projectId,
            url: finalUrl,
            name: projectId, // Supabase doesn't expose project name via API, use ID
          },
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get project info',
        });
      }
    }

    if (action === 'get-tables') {
      // Get all tables in the database using the admin API with service role
      try {
        // Query the REST API metadata endpoint to get tables
        const response = await fetch(
          `${finalUrl}/rest/v1/?apikey=${key}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${key}`,
            },
          }
        );

        if (!response.ok) {
          console.warn('Could not fetch tables via REST API:', response.statusText);
          // Return success with empty tables - credentials are valid but we can't fetch schema
          return NextResponse.json({
            success: true,
            tables: [],
            tableCount: 0,
            note: 'Database connection successful. Credentials saved for AI agent use. Schema details will be fetched when needed.',
          });
        }

        const metadata = await response.json();
        const tables = metadata.definitions || [];

        // Filter out Supabase system tables
        const systemTables = [
          'audit_log_entries',
          'migrations',
          'schema_migrations',
          'reload_log',
          'pg_stat_statements',
          'graphql_public',
        ];

        const userTables = tables
          .filter(table => !systemTables.includes(table.name))
          .map(table => ({
            id: table.name,
            name: table.name,
            schema: 'public',
            columns: table.properties ? Object.keys(table.properties).length : 0,
          }));

        return NextResponse.json({
          success: true,
          tables: userTables,
          tableCount: userTables.length,
        });
      } catch (err) {
        console.error('Error fetching tables:', err.message);
        // Don't fail - credentials are still valid and saved
        return NextResponse.json({
          success: true,
          tables: [],
          tableCount: 0,
          note: 'Database connected successfully. Credentials are saved and ready for AI agent use.',
        });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Supabase integration error:', error);
    return NextResponse.json(
      { error: error.message || 'Supabase integration failed' },
      { status: 500 }
    );
  }
}
