# GitHub PAT Storage for Fork & Deploy

This guide explains how the fork-and-deploy feature stores GitHub Personal Access Tokens (PATs) in `user_env_vars` for seamless user experience after logout/login.

## Overview

Instead of requiring users to paste their GitHub token every time, we can securely store it in the database:

1. **First deployment**: User provides GitHub PAT + checks "Save for future use"
2. **Token is stored** in `user_env_vars` table (encrypted in transit)
3. **Future deployments**: User logs back in, token is automatically retrieved
4. **No manual entry needed** on subsequent deployments

## How It Works

### Storage Flow

```
User enters GitHub PAT
        ↓
[Checkbox] "Save for future use"
        ↓
POST /api/repository/fork-and-deploy with storeToken: true
        ↓
API stores in user_env_vars (provider='github', metadata.token)
        ↓
✓ Token saved response
```

### Retrieval Flow

```
User logs back in
        ↓
POST /api/repository/fork-and-deploy (no gitHubToken provided)
        ↓
API checks user_env_vars for github provider
        ↓
Found stored token
        ↓
✓ Deployment proceeds with stored token
```

## Database Schema

### user_env_vars Table

Tokens are stored in the existing `user_env_vars` table:

```sql
CREATE TABLE user_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'github', 'stripe', etc.
  metadata JSONB NOT NULL, -- {'token': 'github_pat_...'}
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, provider)
);
```

### Example Record

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "provider": "github",
  "metadata": {
    "token": "github_pat_11BU4MGXI0cQQnOvxmHiYh_DMBwVakoB0fyqsjpNW9e0..."
  },
  "created_at": "2025-12-25T10:00:00Z",
  "updated_at": "2025-12-25T10:00:00Z"
}
```

## API Changes

### POST /api/repository/fork-and-deploy

**Request with Token Storage:**

```json
{
  "gitHubToken": "github_pat_...",
  "sourceOwner": "facebook",
  "sourceRepo": "react",
  "branch": "main",
  "region": "cdg",
  "storeToken": true  // NEW: Request to store token
}
```

**Request using Stored Token:**

```json
{
  "sourceOwner": "facebook",
  "sourceRepo": "react",
  "branch": "main",
  "region": "cdg"
  // No gitHubToken - API will use stored one
}
```

**Response:**

```json
{
  "success": true,
  "tokenStored": true,  // NEW: Indicates token was stored
  "fork": {...},
  "deployment": {...}
}
```

## Component Updates

### RepositoryOnboardingFlow Props

```jsx
<RepositoryOnboardingFlow
  authToken={supabaseToken}
  sourceOwner="facebook"
  sourceRepo="react"
  gitHubToken={undefined}        // Optional - uses stored if available
  hasStoredToken={true}          // NEW: Show saved token indicator
  onTokenStored={() => {...}}    // NEW: Callback when token stored
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

### UI Features

1. **Token Storage Checkbox**
   - Shows when user provides a token
   - "Save GitHub token for future deployments"
   - Stores token in user_env_vars on success

2. **Stored Token Indicator**
   - Shows when user has a saved token
   - "✓ Saved token detected"
   - Allows reuse without entering token

3. **Token Selection**
   - Users can choose to use saved token or provide new one
   - Helpful for:
     - Multiple GitHub accounts
     - Rotating tokens for security
     - Switching teams

## Security Considerations

### Data Protection

1. **In Transit**: Tokens are sent over HTTPS (encrypted)
2. **At Rest**: Tokens stored in Supabase (encrypted by default)
3. **User Scope**: Each user only sees their own tokens

### Token Management

1. **Limited Scope**: Users should create tokens with minimal permissions
   - Recommended: `repo` scope only (read/write to repositories)
   - NOT: `admin`, `delete_repo`, `gist`

2. **Automatic Updates**: 
   - If new token is provided, old one is updated
   - Prevents accumulation of unused tokens

3. **Logout**: Tokens remain stored (user convenience)
   - If security concern, user can revoke on GitHub
   - Can also implement "Forget token" button

### Best Practices

```javascript
// ✓ DO: Create limited-scope token
// At https://github.com/settings/tokens/new
// Permissions: repo (read/write public/private repos)

// ✗ DON'T: Use organization-wide tokens
// ✗ DON'T: Store multiple tokens per user
// ✗ DON'T: Log tokens in console
```

## Implementation Checklist

- [x] API endpoint updated (getGitHubToken, storeGitHubToken)
- [x] Request body accepts storeToken flag
- [x] Response includes tokenStored boolean
- [x] Component shows checkbox for token storage
- [x] Component shows stored token indicator
- [x] Example page implements UI
- [x] Documentation updated
- [ ] **User needs to ensure**: user_env_vars table exists with proper schema
- [ ] **Optional**: Add "Forget token" button to settings

## Example Usage

### Complete Flow

```jsx
'use client';

import RepositoryOnboardingFlow from '@/components/RepositoryOnboardingFlow';
import { useState } from 'react';

export default function DeployPage() {
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [githubToken, setGithubToken] = useState('');

  return (
    <RepositoryOnboardingFlow
      authToken={supabaseToken}
      sourceOwner="facebook"
      sourceRepo="react"
      gitHubToken={githubToken || undefined}  // Use provided or stored
      hasStoredToken={hasStoredToken}
      
      // Called when token is successfully stored
      onTokenStored={() => {
        setHasStoredToken(true);
        setGithubToken('');  // Clear form
        alert('Token saved for future use!');
      }}
      
      // Called on successful deployment
      onSuccess={(result) => {
        console.log('Deployment complete:', result.deployment.previewUrl);
      }}
      
      onError={(error) => {
        alert('Deployment failed: ' + error.message);
      }}
    />
  );
}
```

### Check if Token Exists

```javascript
async function getStoredGitHubToken(userId, authToken) {
  const response = await fetch('/api/user/env-vars?provider=github', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) return null;
  
  const data = await response.json();
  return data.token || null;
}
```

### Delete Stored Token

```javascript
async function deleteStoredGitHubToken(authToken) {
  const response = await fetch('/api/user/env-vars/github', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  return response.ok;
}
```

## Testing

### Test Scenario 1: First Deployment with Storage

1. Visit `/onboarding/fork-and-deploy`
2. Enter repo owner/name (e.g., facebook/react)
3. Paste GitHub PAT
4. Check "Save GitHub token"
5. Click "Start Deployment"
6. Verify token is stored in `user_env_vars` table

### Test Scenario 2: Reuse Stored Token

1. Logout and login again
2. Visit `/onboarding/fork-and-deploy`
3. Enter different repo owner/name
4. Do NOT paste token
5. Click "Start Deployment"
6. Should automatically use stored token
7. Deployment should succeed

### Test Scenario 3: Override Stored Token

1. Have a stored token
2. Visit `/onboarding/fork-and-deploy`
3. Uncheck "Use saved token"
4. Paste a different GitHub PAT
5. Click "Start Deployment"
6. Should update stored token in database

## Troubleshooting

### "GitHub token not configured" Error

**Cause**: No token provided and no stored token found

**Solution**:
1. Provide GitHub PAT in form
2. Check that user_env_vars table exists
3. Verify Supabase queries are working

### Token is not being saved

**Cause**: storeToken flag not being set

**Solution**:
1. Check checkbox is visible: `gitHubToken` prop must be provided
2. Check `storeToken: true` is sent in request
3. Verify response includes `tokenStored: true`

### Stored token is outdated

**Cause**: User rotated GitHub token

**Solution**:
1. Provide new token in form
2. Uncheck "Use saved token"
3. New token will update the stored one

## Migration Notes

If you already have users with GitHub integrations stored elsewhere:

```javascript
// Example migration from old storage to user_env_vars
async function migrateStoredTokens() {
  const users = await getOldGitHubIntegrations();
  
  for (const user of users) {
    await supabaseServer
      .from('user_env_vars')
      .insert({
        user_id: user.id,
        provider: 'github',
        metadata: { token: user.github_token },
      });
  }
}
```

## Future Enhancements

- [ ] Token expiration/refresh handling
- [ ] Multiple GitHub accounts per user
- [ ] Token scopes visualization
- [ ] Automatic token rotation
- [ ] GitHub API rate limit checking
- [ ] Integration with GitHub App (OAuth) instead of PAT
