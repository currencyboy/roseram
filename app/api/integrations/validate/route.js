export async function POST(request) {
  try {
    const { type, credentials } = await request.json();

    if (!type || !credentials) {
      return Response.json(
        { valid: false, message: 'Missing type or credentials' },
        { status: 400 }
      );
    }

    let isValid = false;
    let message = '';

    switch (type) {
      case 'github':
        isValid = await validateGithub(credentials.token);
        message = isValid
          ? 'GitHub token is valid'
          : 'Invalid or expired GitHub token';
        break;

      case 'supabase':
        isValid = await validateSupabase(credentials.url, credentials.key);
        message = isValid
          ? 'Supabase credentials are valid'
          : 'Invalid Supabase URL or API key';
        break;

      case 'netlify':
        isValid = await validateNetlify(credentials.token);
        message = isValid
          ? 'Netlify token is valid'
          : 'Invalid or expired Netlify token';
        break;

      default:
        return Response.json(
          { valid: false, message: 'Unknown integration type' },
          { status: 400 }
        );
    }

    return Response.json({ valid: isValid, message });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json(
      { valid: false, message: `Validation failed: ${error.message}` },
      { status: 500 }
    );
  }
}

async function validateGithub(token) {
  if (!token || token.trim() === '') {
    return false;
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('GitHub validation error:', error);
    return false;
  }
}

async function validateSupabase(url, key) {
  if (!url || !key || url.trim() === '' || key.trim() === '') {
    return false;
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    return response.ok || response.status === 401;
  } catch (error) {
    console.error('Supabase validation error:', error);
    return false;
  }
}

async function validateNetlify(token) {
  if (!token || token.trim() === '') {
    return false;
  }

  try {
    const response = await fetch('https://api.netlify.com/api/v1/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Netlify validation error:', error);
    return false;
  }
}
