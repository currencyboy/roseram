import { NextResponse } from 'next/server';

/**
 * Maps selected resources to environment variables
 * Auto-generates required env variables based on platform selections
 */
export async function POST(request) {
  try {
    const {
      action,
      githubRepo,
      supabaseProject,
      netlifyWebsite,
      githubToken,
      supabaseUrl,
      supabaseKey,
      netlifyToken,
    } = await request.json();

    if (action === 'generate-env-vars') {
      const envVars = {};

      // GitHub environment variables
      if (githubToken) {
        envVars['GITHUB_ACCESS_TOKEN'] = githubToken;
        envVars['NEXT_PUBLIC_GITHUB_ACCESS_TOKEN'] = githubToken;
      }

      if (githubRepo) {
        envVars['GITHUB_REPO_OWNER'] = githubRepo.owner;
        envVars['GITHUB_REPO_NAME'] = githubRepo.name;
        envVars['GITHUB_REPO_URL'] = githubRepo.url;
        envVars['GITHUB_DEFAULT_BRANCH'] = githubRepo.defaultBranch || 'main';
      }

      // Supabase environment variables
      if (supabaseUrl) {
        envVars['NEXT_PUBLIC_SUPABASE_PROJECT_URL'] = supabaseUrl;
        envVars['SUPABASE_PROJECT_URL'] = supabaseUrl;
      }

      if (supabaseKey) {
        envVars['NEXT_PUBLIC_SUPABASE_ANON'] = supabaseKey;
        envVars['SUPABASE_ANON'] = supabaseKey;
      }

      if (supabaseProject) {
        envVars['SUPABASE_PROJECT_ID'] = supabaseProject.id;
        envVars['SUPABASE_PROJECT_NAME'] = supabaseProject.name;
      }

      // Netlify environment variables
      if (netlifyToken) {
        envVars['NEXT_NETLIFY_ACCESS_TOKEN'] = netlifyToken;
        envVars['NETLIFY_ACCESS_TOKEN'] = netlifyToken;
      }

      if (netlifyWebsite) {
        envVars['NEXT_NETLIFY_SITE_ID'] = netlifyWebsite.siteId;
        envVars['NETLIFY_SITE_ID'] = netlifyWebsite.siteId;
        envVars['NETLIFY_SITE_NAME'] = netlifyWebsite.name;
        envVars['NETLIFY_SITE_DOMAIN'] = netlifyWebsite.domain;
      }

      return NextResponse.json({
        success: true,
        envVars,
      });
    }

    if (action === 'get-required-vars') {
      /**
       * Returns which environment variables are required/configured
       */
      const required = {
        github: [
          'GITHUB_ACCESS_TOKEN',
          'NEXT_PUBLIC_GITHUB_ACCESS_TOKEN',
          'GITHUB_REPO_OWNER',
          'GITHUB_REPO_NAME',
        ],
        supabase: [
          'NEXT_PUBLIC_SUPABASE_PROJECT_URL',
          'NEXT_PUBLIC_SUPABASE_ANON',
          'SUPABASE_PROJECT_ID',
        ],
        netlify: [
          'NETLIFY_ACCESS_TOKEN',
          'NETLIFY_SITE_ID',
          'NETLIFY_SITE_NAME',
        ],
      };

      return NextResponse.json({
        success: true,
        required,
      });
    }

    if (action === 'validate-env-vars') {
      /**
       * Validates which environment variables are currently configured
       */
      const configured = {
        github: {
          token: !!process.env.GITHUB_ACCESS_TOKEN || !!process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN,
          repo: !!process.env.GITHUB_REPO_OWNER && !!process.env.GITHUB_REPO_NAME,
        },
        supabase: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON,
          projectId: !!process.env.SUPABASE_PROJECT_ID,
        },
        netlify: {
          token: !!process.env.NETLIFY_ACCESS_TOKEN || !!process.env.NEXT_NETLIFY_ACCESS_TOKEN,
          siteId: !!process.env.NETLIFY_SITE_ID,
        },
      };

      return NextResponse.json({
        success: true,
        configured,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Environment mapping error:', error);
    return NextResponse.json(
      { error: error.message || 'Environment mapping failed' },
      { status: 500 }
    );
  }
}
