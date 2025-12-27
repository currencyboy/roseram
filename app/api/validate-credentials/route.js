import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const credentials = await request.json();
    const results = {
      allValid: true,
      validServices: [],
      expiredServices: [],
      errors: {},
    };

    // Validate GitHub token
    if (credentials.github_token) {
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${credentials.github_token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (response.ok) {
          const user = await response.json();
          results.validServices.push({
            service: 'github',
            username: user.login,
            id: user.id,
          });
        } else {
          results.allValid = false;
          results.expiredServices.push('github');
          results.errors.github = 'Token is invalid or expired';
        }
      } catch (error) {
        results.allValid = false;
        results.expiredServices.push('github');
        results.errors.github = error.message;
      }
    }

    // Validate Supabase credentials
    if (credentials.supabase_url && credentials.supabase_anon_key) {
      try {
        const response = await fetch(
          `${credentials.supabase_url}/rest/v1/`,
          {
            headers: {
              'apikey': credentials.supabase_anon_key,
              'Authorization': `Bearer ${credentials.supabase_anon_key}`,
            },
          }
        );

        if (response.ok) {
          results.validServices.push({
            service: 'supabase',
            url: credentials.supabase_url,
          });
        } else {
          results.allValid = false;
          results.expiredServices.push('supabase');
          results.errors.supabase = 'Credentials are invalid or expired';
        }
      } catch (error) {
        results.allValid = false;
        results.expiredServices.push('supabase');
        results.errors.supabase = error.message;
      }
    }

    // Validate Netlify token
    if (credentials.netlify_token) {
      try {
        const response = await fetch('https://api.netlify.com/api/v1/user', {
          headers: {
            'Authorization': `Bearer ${credentials.netlify_token}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          results.validServices.push({
            service: 'netlify',
            email: user.email,
            id: user.id,
          });
        } else {
          results.allValid = false;
          results.expiredServices.push('netlify');
          results.errors.netlify = 'Token is invalid or expired';
        }
      } catch (error) {
        results.allValid = false;
        results.expiredServices.push('netlify');
        results.errors.netlify = error.message;
      }
    }

    // Validate X API key
    if (credentials.x_api_key) {
      try {
        const response = await fetch('https://api.x.ai/v1/models', {
          headers: {
            'Authorization': `Bearer ${credentials.x_api_key}`,
          },
        });

        if (response.ok) {
          results.validServices.push({
            service: 'x_api',
          });
        } else {
          results.allValid = false;
          results.expiredServices.push('x_api');
          results.errors.x_api = 'API key is invalid or expired';
        }
      } catch (error) {
        results.allValid = false;
        results.expiredServices.push('x_api');
        results.errors.x_api = error.message;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate credentials', details: error.message },
      { status: 500 }
    );
  }
}
