# Fly.io Real Deployment Integration - Setup Guide

## Overview

The Fly.io integration has been updated to support real application deployments instead of mock loading states. When a user selects a repository in EnhancedIntegrationModal, the system:

1. Creates a unique Fly.io app for the user-project combination
2. Initiates deployment from the GitHub repository
3. Polls deployment status in real-time
4. Shows accurate status updates ("Queued" → "Initializing" → "Running")

## Architecture

```
User selects repo in EnhancedIntegrationModal
         ↓
CodeBuilder receives projectId
         ↓
FlyPreview component mounts with projectId
         ↓
GET /api/fly-preview creates preview app record
         ↓
Background job triggers deployToFlyIO()
         ↓
Fly.io app is provisioned
         ↓
Status polling begins (5-second intervals)
         ↓
FlyPreview component updates as status changes
         ↓
User sees live app at https://roseram-{hash}.fly.dev
```

## Files Modified

### Core Implementation
- **lib/flyio.js** - Fly.io API client and deployment functions
- **app/api/fly-preview/route.js** - Preview app provisioning API
- **components/FlyPreview.jsx** - Real-time status updates UI

### Integration Points
- **components/EnhancedIntegrationModal.jsx** - Triggers preview after repo selection
- **components/CodeBuilder.jsx** - Passes projectId to FlyPreview component

## Environment Configuration

### Required Environment Variables

```env
FLYIO=<your-fly-io-api-token>
# or
NEXT_PUBLIC_FLYIO_TOKEN=<your-fly-io-api-token>
```

The token must be a valid Fly.io API token with:
- App creation permissions
- Deployment permissions
- Status query permissions

### Optional Environment Variables

```env
NEXT_PUBLIC_FLY_ORG_ID=<your-organization-id>
# If not provided, defaults to 'personal'
```

## Deployment Methods

For actual applications to deploy successfully, choose one:

### Method 1: GitHub Actions (Recommended)

Create `.github/workflows/deploy-preview.yml`:

```yaml
name: Deploy Preview to Fly.io

on:
  push:
    branches:
      - roseram-*
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master
        with:
          version: latest
      
      - run: |
          flyctl deploy \
            --app ${{ github.event.repository.name }} \
            --token ${{ secrets.FLY_API_TOKEN }} \
            --strategy immediate
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Add `FLY_API_TOKEN` secret to your GitHub repository.

### Method 2: Dockerfile in Repository

If your repo has a `Dockerfile`, Fly.io will use it automatically:

```dockerfile
# Example Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Add `fly.toml` to your repository:

```toml
# fly.toml
app = "roseram-abc12345"
primary_region = "us-east"

[env]
  GITHUB_REPO = "owner/repo"
  BRANCH = "main"

[build]
  builder = "heroku"
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
```

### Method 3: Manual Fly.io CLI

Users can deploy manually using the Fly.io CLI:

```bash
# Clone the repo
git clone https://github.com/owner/repo
cd repo

# Create Fly.io app (one-time)
flyctl apps create roseram-abc12345

# Deploy
flyctl deploy --app roseram-abc12345
```

## Component Behavior

### FlyPreview Component States

The FlyPreview component now displays:

#### Queued State
```
Status: "Queued"
Message: "Preparing Deployment"
Icon: Clock (pulsing)
Duration: Until initializing starts
```

#### Initializing State
```
Status: "Initializing"
Message: "Deploying to Fly.io - Building and deploying your app (30-120 seconds)"
Icon: Spinner
Duration: Until deployment completes
```

#### Running State
```
Status: "Running"
Display: Live iframe with the deployed app
Navigation: URL input bar for routing
Actions: Refresh, Open in new tab
```

#### Error State
```
Status: "Error"
Message: Specific error details
Action: Retry button
```

### Real-Time Polling

- Polling interval: 5 seconds
- Maximum attempts: 120 (10 minutes)
- Status check source: Fly.io GraphQL API

## Database Schema

The `fly_preview_apps` table stores:

```sql
CREATE TABLE public.fly_preview_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  fly_app_name TEXT NOT NULL,
  fly_app_id TEXT NOT NULL,
  github_repo_url TEXT NOT NULL,
  github_branch TEXT NOT NULL DEFAULT 'main',
  status TEXT DEFAULT 'queued',
  preview_url TEXT NOT NULL,
  error_message TEXT,
  env_variables JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id, user_id)
);
```

Status values:
- `queued` - Waiting to start deployment
- `initializing` - Deployment in progress
- `running` - App is live and accessible
- `error` - Deployment failed
- `stopped` - App marked for deletion

## API Endpoints

### GET /api/fly-preview?projectId={projectId}

Creates or retrieves preview app.

**Request:**
```bash
curl -H "Authorization: Bearer $SESSION_TOKEN" \
  "http://localhost:3001/api/fly-preview?projectId=abc-123"
```

**Response:**
```json
{
  "success": true,
  "app": {
    "id": "uuid",
    "projectId": "uuid",
    "appName": "roseram-abc12345",
    "previewUrl": "https://roseram-abc12345.fly.dev",
    "status": "queued",
    "errorMessage": null
  }
}
```

### POST /api/fly-preview

Get current app status.

**Request:**
```bash
curl -X POST -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appId": "app-uuid"}' \
  "http://localhost:3001/api/fly-preview"
```

**Response:**
```json
{
  "success": true,
  "app": {
    "status": "initializing",
    "appName": "roseram-abc12345",
    "previewUrl": "https://roseram-abc12345.fly.dev"
  }
}
```

### DELETE /api/fly-preview?appId={appId}

Stop preview app.

**Request:**
```bash
curl -X DELETE -H "Authorization: Bearer $SESSION_TOKEN" \
  "http://localhost:3001/api/fly-preview?appId=app-uuid"
```

## Testing

### Local Testing

1. Ensure Fly.io token is set in environment
2. Create a test project with a GitHub URL
3. Open CodeBuilder preview tab
4. Observe status progression:
   - Queued → Initializing → Running (or Error)
5. Check database:
   ```sql
   SELECT * FROM fly_preview_apps 
   WHERE project_id = 'your-test-project-id';
   ```

### Troubleshooting

#### "Fly.io is not configured"
- Verify `FLYIO` or `NEXT_PUBLIC_FLYIO_TOKEN` environment variable is set
- Token format should be `FlyV1 ...` or similar Fly.io token format

#### "Deployment timeout"
- Check if the GitHub repo has a `fly.toml` or `Dockerfile`
- Verify the GitHub repo is accessible
- Check Fly.io dashboard for app creation errors

#### "Project not found"
- Ensure the project has a `github_url` field set
- Check database connection to projects table

#### Status stuck on "Initializing"
- Check Fly.io API logs
- Verify app was created in Fly.io dashboard
- Manually deploy using `flyctl deploy`

## Monitoring

### View Deployment Logs

```bash
# Connect to Fly.io CLI
flyctl auth login

# View logs for an app
flyctl logs --app roseram-abc12345
```

### Database Monitoring

Monitor app deployments:

```sql
SELECT 
  pa.fly_app_name,
  pa.status,
  pa.created_at,
  pa.updated_at,
  EXTRACT(MINUTE FROM (NOW() - pa.updated_at)) as minutes_since_update
FROM fly_preview_apps pa
ORDER BY pa.updated_at DESC
LIMIT 20;
```

## Cost Considerations

- Each Fly.io app: ~$3-5/month (shared plan)
- Idle timeout: 5 minutes (apps automatically stop)
- Data egress: Standard Fly.io pricing
- Recommend: Use autostop machines to minimize costs

## Future Enhancements

1. **Automatic Dockerfile Generation**
   - Detect app type (Node, Python, etc.)
   - Generate optimal Dockerfile automatically

2. **GitHub Actions Integration**
   - Auto-commit workflow file to repo
   - Trigger via webhooks on code push

3. **Health Checks**
   - Periodically ping app URL
   - Alert on failures

4. **Performance Monitoring**
   - Track deployment duration
   - Monitor app performance metrics

5. **Cost Optimization**
   - Auto-scale based on usage
   - Archive old deployments

## References

- [Fly.io Documentation](https://fly.io/docs)
- [Fly.io GraphQL API](https://fly.io/docs/reference/graphql/)
- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/)
- [GitHub Actions for Fly.io](https://github.com/superfly/flyctl-actions)
