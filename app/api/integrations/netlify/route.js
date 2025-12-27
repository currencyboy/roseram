import { NextResponse } from 'next/server';

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';

export async function POST(request) {
  try {
    const { action, token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Netlify token required' },
        { status: 400 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    if (action === 'validate-token') {
      // Validate Netlify token
      try {
        const response = await fetch(`${NETLIFY_API_BASE}/user`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Invalid token');
        }

        const user = await response.json();
        return NextResponse.json({
          success: true,
          valid: true,
          user: {
            email: user.email,
            name: user.full_name,
            id: user.id,
          },
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'Invalid or expired Netlify token',
        });
      }
    }

    if (action === 'get-user') {
      // Get authenticated user info
      const response = await fetch(`${NETLIFY_API_BASE}/user`, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const user = await response.json();
      return NextResponse.json({
        success: true,
        user: {
          email: user.email,
          name: user.full_name,
          id: user.id,
        },
      });
    }

    if (action === 'get-sites') {
      // Get all sites for authenticated user
      const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }

      const sites = await response.json();
      const formattedSites = sites.map(site => ({
        id: site.id,
        name: site.name,
        siteId: site.id,
        domain: site.custom_domain || site.default_domain || site.url,
        url: site.url,
        publishedDeploy: site.published_deploy?.id,
        createdAt: site.created_at,
        state: site.state,
      }));

      return NextResponse.json({
        success: true,
        sites: formattedSites,
      });
    }

    if (action === 'get-site') {
      // Get specific site details
      const { siteId } = await request.json();
      if (!siteId) {
        return NextResponse.json({ error: 'siteId required' }, { status: 400 });
      }

      const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch site');
      }

      const site = await response.json();
      return NextResponse.json({
        success: true,
        site: {
          id: site.id,
          name: site.name,
          siteId: site.id,
          domain: site.custom_domain || site.default_domain || site.url,
          url: site.url,
          publishedDeploy: site.published_deploy?.id,
          buildSettings: site.build_settings,
        },
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Netlify integration error:', error);
    return NextResponse.json(
      { error: error.message || 'Netlify integration failed' },
      { status: 500 }
    );
  }
}
