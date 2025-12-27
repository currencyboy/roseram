# Enhanced Integration Modal Guide

## Overview

The Enhanced Integration Modal provides a robust, user-friendly way to connect multiple platforms (GitHub, Supabase, Netlify) with automatic account detection, credential mapping, and environment variable auto-generation.

## Features

### 1. **OAuth-Style Platform Connection**

Each platform has a dedicated tab with a secure connection flow:

#### GitHub
- Paste personal access token
- Auto-validates token
- Fetches all repositories
- Displays repository details (language, description, default branch)
- Dropdown selector for quick repository switching

#### Supabase
- Enter Project URL and Anon Key
- Auto-validates credentials
- Displays project information
- Secure credential handling

#### Netlify
- Paste personal access token
- Auto-validates token
- Fetches all connected websites
- Displays site domain and SITE ID
- Dropdown selector for quick site selection

### 2. **Dropdown Resource Selectors**

Each platform includes robust dropdown selectors:

**GitHub Repositories**
```
┌────────────────────────────────┐
│ Select Repository              │
├────────────────────────────────┤
│ [Search field]                 │
├────────────────────────────────┤
│ ✓ owner/repo-name             │
│   Branch: main                │
│                               │
│ owner/other-repo              │
│   A cool project              │
└────────────────────────────────┘
```

**Supabase Projects**
- Project name/ID
- Project URL excerpt

**Netlify Sites**
- Site name
- Domain + SITE ID
- Current deployment status

### 3. **Auto-Generated Environment Variables**

When you select resources, environment variables are automatically generated:

```
GITHUB_ACCESS_TOKEN=ghp_...
GITHUB_REPO_OWNER=owner
GITHUB_REPO_NAME=repo-name
GITHUB_DEFAULT_BRANCH=main

SUPABASE_PROJECT_URL=https://xxx.supabase.co
SUPABASE_PROJECT_ID=xxx
SUPABASE_ANON_KEY=eyJ...

NETLIFY_SITE_ID=site-id
NETLIFY_SITE_NAME=My Site
NETLIFY_SITE_DOMAIN=my-site.netlify.app
```

You can copy any variable with the copy button.

### 4. **Platform Validation**

Each platform validates credentials before allowing resource selection:

- **GitHub**: Validates token scope and access
- **Supabase**: Verifies project access and credentials
- **Netlify**: Confirms API token validity

### 5. **Account Auto-Detection**

After successful connection, the modal displays:

- **GitHub**: Username/email of authenticated user
- **Supabase**: Project ID and URL
- **Netlify**: Email and account name

### 6. **Quick Disconnection**

Each connected platform has a "Disconnect" button:
- Removes stored credentials from current session
- Does NOT revoke tokens on the platform side
- Can reconnect with same or new credentials

## How to Use

### Step 1: Open Integration Modal

Click the Settings icon (⚙️) in the Code Builder header or click "Connect GitHub" button.

### Step 2: Connect GitHub

1. Navigate to https://github.com/settings/tokens
2. Create a new token with 'repo' scope
3. Copy the token (starts with `ghp_`)
4. Paste into the "GitHub Personal Access Token" field
5. Click "Connect GitHub"
6. Select a repository from the dropdown

### Step 3: Connect Supabase (Optional)

1. Go to your Supabase project settings
2. Copy the Project URL (https://xxx.supabase.co)
3. Copy the Anon Key (starts with `eyJ`)
4. Paste both into the respective fields
5. Click "Connect Supabase"

### Step 4: Connect Netlify (Optional)

1. Go to https://app.netlify.com/user/applications/personal-access-tokens
2. Create a new token
3. Copy the token (starts with `nfp_`)
4. Paste into the "Netlify Personal Access Token" field
5. Click "Connect Netlify"
6. Select a website from the dropdown

### Step 5: Copy Environment Variables

Once all platforms are connected, environment variables appear at the bottom.

Click the copy icon next to any variable to copy the `KEY=VALUE` format.

## API Endpoints

### GitHub Integration
```
POST /api/integrations/github
Body: {
  action: 'validate-token' | 'get-repos' | 'get-user',
  token: string
}
```

### Supabase Integration
```
POST /api/integrations/supabase
Body: {
  action: 'validate-credentials' | 'get-project-info' | 'get-tables',
  url: string,
  key: string
}
```

### Netlify Integration
```
POST /api/integrations/netlify
Body: {
  action: 'validate-token' | 'get-user' | 'get-sites',
  token: string
}
```

### Environment Variable Mapping
```
POST /api/integrations/env-mapping
Body: {
  action: 'generate-env-vars' | 'get-required-vars' | 'validate-env-vars',
  githubRepo?: object,
  supabaseProject?: object,
  netlifyWebsite?: object
}
```

## Environment Variables Generated

### GitHub
- `GITHUB_ACCESS_TOKEN` - Your GitHub token
- `NEXT_PUBLIC_GITHUB_ACCESS_TOKEN` - Public GitHub token
- `GITHUB_REPO_OWNER` - Repository owner username
- `GITHUB_REPO_NAME` - Repository name
- `GITHUB_REPO_URL` - Full GitHub repository URL
- `GITHUB_DEFAULT_BRANCH` - Default branch (usually 'main')

### Supabase
- `NEXT_PUBLIC_SUPABASE_PROJECT_URL` - Project URL
- `SUPABASE_PROJECT_URL` - Server-side project URL
- `NEXT_PUBLIC_SUPABASE_ANON` - Public anon key
- `SUPABASE_ANON` - Server-side anon key
- `SUPABASE_PROJECT_ID` - Project ID extracted from URL

### Netlify
- `NETLIFY_ACCESS_TOKEN` - Your Netlify token
- `NEXT_NETLIFY_ACCESS_TOKEN` - Next.js Netlify token
- `NETLIFY_SITE_ID` - Site ID for deployment
- `NETLIFY_SITE_NAME` - Display name of the site
- `NETLIFY_SITE_DOMAIN` - Site domain/URL

## Security & Best Practices

### Token Security
- ✅ Tokens are input via password fields (masked)
- ✅ Tokens are never logged in console
- ✅ Tokens are only sent to platform-specific API endpoints
- ✅ Tokens are not stored in browser localStorage

### Environment Variable Handling
- ✅ Variables are displayed on-screen for copying
- ✅ Copy function uses secure clipboard API
- ✅ Sensitive values are truncated in the display (first 30 chars)
- ✅ Full values can be copied for use

### Validation
- ✅ All tokens are validated before allowing resource selection
- ✅ Invalid tokens show clear error messages
- ✅ Credentials are tested against actual APIs

## Troubleshooting

### "Invalid GitHub Token"
- Verify the token starts with `ghp_`
- Check token has 'repo' scope
- Ensure token hasn't been revoked
- Create a new token if needed

### "Invalid Supabase Credentials"
- Verify Project URL is correctly copied
- Verify Anon Key is correctly copied
- Check that Supabase project is accessible
- Ensure you're not using Service Role key in the Anon field

### "Invalid Netlify Token"
- Verify the token starts with `nfp_`
- Check token hasn't expired
- Create a new token if needed
- Ensure token has correct scopes

### "No repositories found"
- Ensure your GitHub account has repositories
- Check that the token has access to your repositories
- Verify repositories are not archived

### "No sites found"
- Ensure your Netlify account has deployed sites
- Check that the token has access to your sites
- Verify sites are active (not archived)

## Component Structure

```
EnhancedIntegrationModal
├── PlatformAuthFlow (GitHub)
│   └── ResourceSelector (Repositories)
├── PlatformAuthFlow (Supabase)
│   └── Project Info Display
├── PlatformAuthFlow (Netlify)
│   └── ResourceSelector (Sites)
└── Environment Variables Display
```

## API Integration Flow

```
User Input (Token)
    ↓
Validation Endpoint
    ↓
Auth Success
    ↓
Fetch Resources (Repos/Sites)
    ↓
Display in Dropdown
    ↓
User Selection
    ↓
Generate Environment Variables
    ↓
Display for Copy
```

## Future Enhancements

- [ ] OAuth flow instead of manual token entry
- [ ] Multiple repository/site selection
- [ ] Environment variable preset templates
- [ ] Automatic token refresh
- [ ] Encrypted credential storage
- [ ] Team/organization account support
- [ ] Custom environment variable mapping
- [ ] Integration health dashboard

## Support

For issues or feature requests, contact support or submit feedback.
