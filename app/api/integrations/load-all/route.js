import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const integrations = {
      github: null,
      supabase: null,
      netlify: null,
    };

    // Load GitHub token from env
    if (process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN || process.env.GITHUB_ACCESS_TOKEN) {
      integrations.github = {
        token: process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN || process.env.GITHUB_ACCESS_TOKEN,
        provider: 'github',
      };
    }

    // Load Supabase credentials from env
    if (process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON) {
      integrations.supabase = {
        url: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON,
        provider: 'supabase',
      };
    }

    // Load Netlify token from env
    if (process.env.NEXT_PUBLIC_NETLIFY_ACCESS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN) {
      integrations.netlify = {
        token: process.env.NEXT_PUBLIC_NETLIFY_ACCESS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN,
        provider: 'netlify',
      };
    }

    // If user is authenticated, try to load from user_env_vars
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!authError && user) {
        try {
          const { data, error: queryError } = await supabase
            .from('user_env_vars')
            .select('provider, metadata')
            .eq('user_id', user.id)
            .limit(100);

          if (!queryError && data && Array.isArray(data)) {
            data.forEach(item => {
              if (item.provider === 'github' && item.metadata?.token) {
                integrations.github = {
                  token: item.metadata.token,
                  provider: 'github',
                };
              }
              if (item.provider === 'supabase' && item.metadata?.key) {
                integrations.supabase = {
                  url: item.metadata.url,
                  key: item.metadata.key,
                  provider: 'supabase',
                };
              }
              if (item.provider === 'netlify' && item.metadata?.token) {
                integrations.netlify = {
                  token: item.metadata.token,
                  provider: 'netlify',
                };
              }
            });
          }
        } catch (dbErr) {
          console.error('Error fetching user integrations:', dbErr);
        }
      }
    } catch (supabaseErr) {
      console.error('Error initializing Supabase for load-all:', supabaseErr);
    }

    return NextResponse.json({
      success: true,
      github: integrations.github,
      supabase: integrations.supabase,
      netlify: integrations.netlify,
    });
  } catch (error) {
    console.error('Error in load-all:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load integrations' },
      { status: 500 }
    );
  }
}
