# Fork & Deploy Feature Guide

This feature implements a **Builder.io-style repository forking and deployment system** that allows users to:

1. Fork any GitHub repository to their account
2. Deploy it to Fly.io
3. Get a live preview URL
4. Edit code and see changes instantly

## Architecture

### Components

#### 1. **Repository Orchestrator** (`lib/repository-orchestrator.js`)
Core orchestration logic that handles the complete workflow:
- Fork management (create or reuse existing forks)
- Branch creation and synchronization
- Fly.io deployment
- Status polling until app is running

**Key Methods:**
- `orchestrateForkAndDeploy(userId, githubToken, sourceOwner, sourceRepo, options)` - Main orchestration function
- `generateAppName(userId, projectName)` - Creates unique Fly.io app names
- `getWorkflowStatus(workflowId)` - Track in-progress workflows

**Progress Callback:**
```javascript
progressCallback({
  step: 'step_id',        // e.g., 'fork_start', 'deployed', 'error'
  status: 'in_progress',  // in_progress, complete, error
  message: 'User-friendly message',
  progress: 45,           // 0-100
  ...stepData             // Additional data per step
})
```

#### 2. **API Endpoint** (`app/api/repository/fork-and-deploy/route.js`)
RESTful API for orchestrating deployments:

**POST** `/api/repository/fork-and-deploy`

Requires Bearer token authentication (Supabase auth token).

**Request:**
```json
{
  "gitHubToken": "github_pat_...",  // Optional - will check stored if omitted
  "sourceOwner": "facebook",
  "sourceRepo": "react",
  "branch": "main",
  "region": "cdg",
  "projectId": "project-123",
  "storeToken": true                // Optional - save for future use
}
```

**Response:**
```json
{
  "success": true,
  "workflowId": "abc123...",
  "fork": {
    "url": "https://github.com/username/react",
    "cloneUrl": "https://github.com/username/react.git",
    "owner": "username",
    "repo": "react",
    "branch": "main",
    "isNewFork": true
  },
  "deployment": {
    "appName": "roseram-abc12345",
    "previewUrl": "https://roseram-abc12345.fly.dev",
    "region": "cdg",
    "status": "running",
    "deploymentId": "deployment-123"
  }
}
```

**GET** `/api/repository/fork-and-deploy?workflowId=xxx`

Get status of an in-progress workflow (while orchestration is running).

#### 3. **UI Component** (`components/RepositoryOnboardingFlow.jsx`)
React component that handles the user interface for the deployment flow.

**Features:**
- Progress indicator with real-time updates
- Step-by-step visualization
- Error handling and retry
- Success state with result links
- Responsive design

**Props:**
```javascript
{
  authToken,      // Supabase auth token (Bearer token)
  sourceOwner,    // GitHub repo owner (e.g., "facebook")
  sourceRepo,     // GitHub repo name (e.g., "react")
  gitHubToken,    // User's GitHub PAT
  onSuccess,      // Callback when deployment succeeds
  onError,        // Callback if deployment fails
  branch,         // Branch to deploy (default: "main")
  region,         // Fly.io region (default: "cdg")
  projectId,      // Associated project ID (optional)
}
```

#### 4. **Example Integration Page** (`app/onboarding/fork-and-deploy/page.jsx`)
Complete example implementation showing:
- Form for collecting user inputs
- Integration with the component
- Success/error handling
- Result display

**Access at:** `GET /onboarding/fork-and-deploy`

## Usage

### Basic Integration

```jsx
import RepositoryOnboardingFlow from '@/components/RepositoryOnboardingFlow';

export default function MyPage() {
  const handleSuccess = (result) => {
    console.log('Deployment complete!', result);
    // Redirect to preview, save to database, etc.
  };

  const handleError = (error) => {
    console.error('Deployment failed:', error.message);
  };

  const handleTokenStored = () => {
    console.log('GitHub token saved for future use');
  };

  return (
    <RepositoryOnboardingFlow
      authToken={supabaseToken}
      sourceOwner="facebook"
      sourceRepo="react"
      gitHubToken={userGitHubToken}  // Optional if user has stored token
      onSuccess={handleSuccess}
      onError={handleError}
      onTokenStored={handleTokenStored}
      branch="main"
      region="cdg"
      hasStoredToken={userHasStoredToken}
    />
  );
}
```

### With Stored Token (User convenience)

After the first deployment, the GitHub PAT can be stored in `user_env_vars`:

```jsx
<RepositoryOnboardingFlow
  authToken={supabaseToken}
  sourceOwner="facebook"
  sourceRepo="react"
  gitHubToken={undefined}  // Not provided - will use stored
  hasStoredToken={true}    // User has saved a token
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

The system will automatically:
1. Check for stored GitHub token in `user_env_vars`
2. Use it if available
3. Fall back to provided token if needed
4. Optionally store new token for future deployments

### Using the API Directly

```javascript
const response = await fetch('/api/repository/fork-and-deploy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    gitHubToken: 'github_pat_...',
    sourceOwner: 'facebook',
    sourceRepo: 'react',
    branch: 'main',
    region: 'cdg',
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Preview URL:', result.deployment.previewUrl);
}
```

## Workflow Steps

1. **Initialize** - Validate tokens and prepare
2. **Fork Repository** - Fork to user's GitHub account or reuse existing
3. **Create Branch** - Ensure requested branch exists on fork
4. **Deploy to Fly.io** - Submit deployment to Fly.io
5. **Poll Status** - Wait for machine to be ready
6. **Success** - Return preview URL and deployment info

## Error Handling

The API returns appropriate HTTP status codes:
- **200** - Success
- **400** - Missing/invalid parameters
- **401** - Authentication failed
- **500** - Server error

All errors include descriptive messages in the response body.

## Database Integration

The API automatically stores deployment records in the `fly_preview_apps` table:

```sql
INSERT INTO fly_preview_apps (
  user_id,
  project_id,
  fork_url,
  fork_owner,
  fork_repo,
  fork_branch,
  fly_app_name,
  preview_url,
  region,
  status,
  source_owner,
  source_repo
) VALUES (...)
```

This allows you to:
- Track deployed projects per user
- Store fork and deployment information
- Link to specific projects
- Display deployment history

## Configuration

### Environment Variables

Required:
- `NEXT_FLY_IO_TOKEN` or `FLY_IO_TOKEN` - Fly.io API token
- `SUPABASE_PROJECT_URL` - Supabase project URL
- `SUPABASE_ANON` - Supabase anon key
- `NEXT_SUPABASE_SERVICE_ROLE` - Supabase service role key

### Fly.io Regions

Supported regions:
- `cdg` - Paris, EU
- `iad` - Ashburn, US
- `lax` - Los Angeles, US
- `lhr` - London, EU
- `nrt` - Tokyo, JP
- `syd` - Sydney, AU

Default: `cdg`

## Performance

### Typical Timeline

- **Fork creation**: 30-60 seconds
- **Deployment submission**: 10-20 seconds
- **Machine startup**: 30-120 seconds
- **Total**: 2-5 minutes

### Limits

- Maximum concurrent workflows: Limited by Fly.io
- Maximum deployment size: Depends on Fly.io machine spec
- Maximum poll time: 10 minutes (600 seconds)

## Troubleshooting

### Fork Already Exists
The system automatically detects and reuses existing forks, creating only the missing branch if needed.

### Deployment Timeout
If deployment doesn't complete within 10 minutes, the system returns the URL anyway (it may still be starting). Check the preview URL directly.

### Invalid GitHub Token
Ensure the PAT has:
- `repo` scope (full control)
- `public_repo` scope (at minimum)

### Fly.io Token Not Configured
Set the `FLY_IO_TOKEN` environment variable with a valid Fly.io API token.

## Advanced Usage

### Checking for Stored Token

To show if a user has a saved GitHub token:

```javascript
async function hasStoredGitHubToken(userId, authToken) {
  const response = await fetch(`/api/user/env-vars?provider=github`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  return !!data.token;
}
```

### Storing Token for Future Use

```javascript
const response = await fetch('/api/repository/fork-and-deploy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    gitHubToken: 'github_pat_...',
    sourceOwner: 'facebook',
    sourceRepo: 'react',
    storeToken: true,  // Save for future use
  }),
});
```

### Clearing Stored Token

```javascript
async function deleteStoredGitHubToken(authToken) {
  const response = await fetch(`/api/user/env-vars/github`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  return response.ok;
}
```

### Real-Time Progress Updates

For real-time updates during deployment, use Server-Sent Events (SSE) or WebSocket:

```javascript
// Example: SSE implementation (future enhancement)
const eventSource = new EventSource('/api/repository/fork-and-deploy/stream?workflowId=123');
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(progress.message, progress.progress + '%');
};
```

### Custom Deployment Options

Extend the orchestrator to support:
- Custom environment variables
- Pre/post-deployment hooks
- Custom Dockerfile
- Build configuration

## Token Storage & Convenience

The system supports storing GitHub PATs in the `user_env_vars` table for seamless reconnection after logout:

### How It Works

1. **First Deployment**: User provides GitHub PAT + checks "Save for future use"
2. **Token Storage**: PAT is encrypted and stored in `user_env_vars` table
3. **Subsequent Deployments**: User logs back in, no need to provide token again
4. **Automatic Retrieval**: API checks `user_env_vars` → finds stored token → uses it

### Database Schema

```sql
-- Tokens stored in user_env_vars
INSERT INTO user_env_vars (
  user_id,
  provider,
  metadata
) VALUES (
  'user-123',
  'github',
  '{"token": "github_pat_..."}'
);
```

### API Response

```json
{
  "success": true,
  "tokenStored": true,  // Indicates token was stored
  "deployment": {...}
}
```

## Security Considerations

1. **GitHub PAT Storage** - Tokens ARE stored in `user_env_vars` table (encrypted in transit via HTTPS)
2. **User Consent** - Only stored if `storeToken: true` is explicitly sent
3. **Update on Use** - Token can be updated if new one is provided
4. **Authorization** - All requests require valid Supabase auth token
5. **Rate Limiting** - Implement rate limiting at the API endpoint
6. **Token Scope** - Users should create limited-scope GitHub tokens for security (repo scope only)

## Related Files

- `lib/flyio-deployment.js` - Fly.io GraphQL API integration
- `app/api/github/fork/route.js` - Individual fork endpoint (reference)
- `supabase/migrations/comprehensive_preview_system.sql` - Database schema
- `fly.toml` - Fly.io configuration

## Testing

To test locally:

1. Create a test GitHub PAT at https://github.com/settings/tokens
2. Get your Supabase auth token from your session
3. Call the API or use the example page

```bash
curl -X POST http://localhost:3001/api/repository/fork-and-deploy \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gitHubToken": "github_pat_...",
    "sourceOwner": "facebook",
    "sourceRepo": "react",
    "branch": "main",
    "region": "cdg"
  }'
```

## Future Enhancements

- [ ] Real-time progress via WebSocket
- [ ] Cancel/stop deployment mid-process
- [ ] Rollback to previous deployment
- [ ] Custom environment variables per deployment
- [ ] Automatic GitHub Actions workflow for CI/CD
- [ ] Multiple branch deployments
- [ ] Cost estimation before deployment
- [ ] Webhook notifications on deployment status
