import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logger, ValidationError, ExternalServiceError } from '@/lib/errors';

async function deployToNetlify(siteId, supabase) {
  const netlifyToken = process.env.NEXT_NETLIFY_ACCESS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;
  const netlifySiteId = process.env.NEXT_NETLIFY_SITE_ID || process.env.NETLIFY_SITE_ID;

  if (!netlifyToken || !netlifySiteId) {
    throw new ExternalServiceError(
      'Netlify',
      'Netlify credentials not configured',
      { statusCode: 500 }
    );
  }

  try {
    const { data: site } = await supabase
      .from('sites')
      .select('id, name, seo_title, seo_description, description, theme_color, google_analytics_id, og_image_url')
      .eq('id', siteId)
      .single();

    if (!site) {
      throw new ValidationError('Site not found');
    }

    const { data: pages } = await supabase
      .from('pages')
      .select('id, slug, content, custom_css, custom_javascript')
      .eq('site_id', siteId)
      .eq('status', 'published');

    const files = {
      'index.html': generateHTML(site, pages || []),
      'style.css': generateCSS(pages || []),
      'script.js': generateJS(pages || []),
    };

    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          title: `Deploy of ${site.name}`,
        }),
      }
    );

    if (!response.ok) {
      throw new ExternalServiceError(
        'Netlify',
        `Deployment failed with status ${response.status}`,
        { statusCode: 500 }
      );
    }

    const deployment = await response.json();

    return {
      deploymentId: deployment.id,
      url: deployment.url,
      previewUrl: deployment.preview_url,
      status: 'deployed',
    };
  } catch (error) {
    if (error instanceof ExternalServiceError || error instanceof ValidationError) {
      throw error;
    }
    throw new ExternalServiceError(
      'Netlify',
      'Failed to deploy to Netlify',
      { statusCode: 500, details: String(error) }
    );
  }
}

async function deployToVercel(siteId, supabase) {
  const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !vercelProjectId) {
    throw new ExternalServiceError(
      'Vercel',
      'Vercel credentials not configured',
      { statusCode: 500 }
    );
  }

  logger.warn('Vercel deployment initiated but requires additional setup');

  return {
    deploymentId: `vercel-${Date.now()}`,
    url: `https://${process.env.NEXT_PUBLIC_APP_URL || 'roseram.com'}`,
    status: 'pending',
  };
}

function generateHTML(site, pages) {
  const homePage = pages.find(p => p.slug === 'home' || p.slug === 'index') || pages[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.seo_title || site.name}</title>
  <meta name="description" content="${site.seo_description || site.description}">
  <meta property="og:title" content="${site.seo_title || site.name}">
  <meta property="og:description" content="${site.seo_description || site.description}">
  ${site.og_image_url ? `<meta property="og:image" content="${site.og_image_url}">` : ''}
  ${site.google_analytics_id ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${site.google_analytics_id}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${site.google_analytics_id}');
  </script>
  ` : ''}
  <link rel="stylesheet" href="style.css">
  <style>
    :root {
      --theme-color: ${site.theme_color || '#000000'};
    }
  </style>
</head>
<body>
  ${homePage?.content?.blocks ? generatePageContent(homePage.content.blocks) : '<main class="container"><h1>Welcome to ' + site.name + '</h1></main>'}
  <script src="script.js"></script>
</body>
</html>`;
}

function generateCSS(pages) {
  let css = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

main {
  min-height: 100vh;
}

/* Navigation */
nav {
  background-color: #f8f9fa;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

nav ul {
  display: flex;
  list-style: none;
  gap: 2rem;
}

/* Responsive */
@media (max-width: 768px) {
  nav ul {
    flex-direction: column;
    gap: 1rem;
  }
}
`;

  pages.forEach(page => {
    if (page.custom_css) {
      css += '\n' + page.custom_css;
    }
  });

  return css;
}

function generateJS(pages) {
  let js = `
// Builder.io Generated Site - JavaScript
(function() {
  'use strict';

  console.log('Site initialized');

  // Navigation handler
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.href.includes('#')) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Mobile menu toggle
  const menuButton = document.querySelector('[data-toggle="menu"]');
  const menu = document.querySelector('[data-menu]');
  if (menuButton && menu) {
    menuButton.addEventListener('click', function() {
      menu.classList.toggle('active');
    });
  }
})();
`;

  pages.forEach(page => {
    if (page.custom_javascript) {
      js += '\n' + page.custom_javascript;
    }
  });

  return js;
}

function generatePageContent(blocks) {
  return blocks
    .map(block => {
      switch (block.type) {
        case 'hero':
          return `<section class="hero">
            <div class="container">
              <h1>${block.data?.title || 'Welcome'}</h1>
              <p>${block.data?.description || ''}</p>
            </div>
          </section>`;
        case 'features':
          return `<section class="features">
            <div class="container">
              <h2>${block.data?.title || 'Features'}</h2>
              ${block.data?.items?.map((item) => `<div class="feature"><h3>${item.title}</h3><p>${item.description}</p></div>`).join('')}
            </div>
          </section>`;
        default:
          return `<section>${block.html || ''}</section>`;
      }
    })
    .join('\n');
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      siteId,
      platform,
      environment = 'production',
    } = body;

    if (!siteId || !platform) {
      throw new ValidationError('siteId and platform are required');
    }

    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, organization_id, name, description')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role')
      .eq('organization_id', site.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { data: deployment, error: deployError } = await supabase
      .from('deployments')
      .insert({
        site_id: siteId,
        platform,
        environment,
        status: 'building',
        triggered_by: user.id,
      })
      .select('id, site_id, platform, environment, status, created_at, updated_at')
      .single();

    if (deployError) {
      throw deployError;
    }

    logger.info('Deployment initiated', {
      deploymentId: deployment.id,
      siteId,
      platform,
    });

    let deploymentResult;
    try {
      switch (platform) {
        case 'netlify':
          deploymentResult = await deployToNetlify(siteId, supabase);
          break;
        case 'vercel':
          deploymentResult = await deployToVercel(siteId, supabase);
          break;
        default:
          deploymentResult = {
            deploymentId: deployment.id,
            status: 'pending',
          };
      }

      await supabase
        .from('deployments')
        .update({
          status: deploymentResult.status,
          deployment_url: deploymentResult.url,
          deployment_id: deploymentResult.deploymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deployment.id);
    } catch (error) {
      await supabase
        .from('deployments')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deployment.id);

      throw error;
    }

    await supabase.from('activity_logs').insert({
      organization_id: site.organization_id,
      user_id: user.id,
      action: 'site_deployed',
      resource_type: 'deployment',
      resource_id: deployment.id,
    });

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        ...deploymentResult,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    if (error instanceof ExternalServiceError) {
      logger.error('Deployment error', error);
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Error creating deployment', error);
    return NextResponse.json(
      { error: 'Failed to deploy site', success: false },
      { status: 500 }
    );
  }
}
