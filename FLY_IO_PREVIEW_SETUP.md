# Fly.io Dynamic Preview System Setup (Simplified)

## Overview
Replaces Sandpack with dynamic Fly.io app provisioning. Each user project gets a unique Fly.io app URL that runs their repository with hot-reload capability.

**Architecture:**
```
User edits code → Preview component loads → API tracks preview URL → 
Fly.io hosts the app → User sees live preview with hot-reload
```

## Current Implementation Status

### ✅ Completed
- [x] Database schema (`fly_preview_apps` table)
- [x] API endpoints (`GET /api/fly-preview`, `DELETE /api/fly-preview`)
- [x] Frontend component (`FlyPreview.jsx`)
- [x] Integration with CodeBuilder
- [x] Environment variables configured

### ⏳ Next Steps (Deployment)
The system currently:
1. **Creates records** in `fly_preview_apps` table for tracking
2. **Generates unique app names** (e.g., `roseram-a1b2c3d4`)
3. **Returns preview URL** that will be available once deployed
4. **Queues deployment** for background processing

To complete the Fly.io integration:

## Deployment Strategy

### Option 1: GitHub Actions + Fly.io CLI (Recommended)
Trigger Fly.io deploys via GitHub Actions when users save code:

```yaml
# .github/workflows/deploy-preview.yml
name: Deploy Preview
on:
  workflow_dispatch:
    inputs:
      projectId:
        description: Project ID
        required: true
      appName:
        description: Fly.io App Name
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: |
          flyctl deploy \
            --app ${{ github.event.inputs.appName }} \
            --token ${{ secrets.FLY_API_TOKEN }}
```

### Option 2: Node.js Fly.io API
Use the Fly.io GraphQL API (more complex, requires `@fly/sdk`):

```bash
npm install @fly/sdk
```

Then call the SDK in `app/api/fly-preview/route.js`.

### Option 3: Lightweight Server
Run a simple Node.js server on Fly.io that:
1. Clones the GitHub repo
2. Runs `npm install && npm run dev`
3. Exposes preview via proxy

## Database Setup

### 1. Run SQL Migration
Execute in Supabase SQL Editor:

```sql
-- File: migrations/003_add_fly_preview_apps.sql
-- Creates fly_preview_apps table with RLS policies
```

### 2. Verify Table Structure
```sql
SELECT * FROM public.fly_preview_apps LIMIT 1;
```

## Environment Variables

### Required
```env
FLY_IO_API_TOKEN=<your_fly_api_token>
```

### Optional
```env
NEXT_PUBLIC_ROSERAM_DOMAIN=roseram.com
FLY_ORG_ID=<your_fly_organization_id>
```

## API Endpoints

### GET `/api/fly-preview?projectId=xyz`
Provisions or retrieves a preview app.

**Authentication:** Bearer token (from session)

**Request:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/fly-preview?projectId=abc-123"
```

**Response (pending):**
```json
{
  "success": true,
  "app": {
    "id": "uuid",
    "projectId": "uuid",
    "appName": "roseram-a1b2c3d4",
    "previewUrl": "https://roseram-a1b2c3d4.fly.dev",
    "status": "pending",
    "errorMessage": null
  }
}
```

### DELETE `/api/fly-preview?appId=xyz`
Marks preview app for deletion.

**Response:**
```json
{
  "success": true,
  "message": "Preview app marked for deletion"
}
```

## Component Usage

```jsx
import { FlyPreview } from '@/components/FlyPreview';

<FlyPreview
  projectId="project-uuid"
  autoRefresh={true}
  onUrlChange={(path) => console.log(path)}
  refreshTrigger={0}
/>
```

## How It Works Currently

1. **User opens CodeBuilder** with a project that has GitHub URL
2. **Preview component loads** and calls `GET /api/fly-preview?projectId=xyz`
3. **API checks database** for existing preview record
   - If exists: returns it
   - If new: creates record with `status: 'pending'`
4. **Component shows loading state** with app name and preview URL
5. **User sees** "Deploying to Fly.io..." message
6. **Once deployed** (manual step for now), preview shows live at the URL

## Unique App Naming

App names are deterministic:
```
roseram-{md5(userId-projectId).slice(0, 8)}
```

Example:
- User: `d20f481d-f7ac-4c72-8b42-c683320a6b6e`
- Project: `abc-123-def`
- Result: `roseram-a1b2c3d4`

This ensures:
- ✅ Unique per user-project combo
- ✅ Predictable (same user+project = same app)
- ✅ Scoped isolation

## URL Structure

```
https://roseram-a1b2c3d4.fly.dev/
https://roseram-a1b2c3d4.fly.dev/path/to/page
https://roseram-a1b2c3d4.fly.dev/admin/settings
```

## Next: Implement Actual Deployment

To go from "pending" → "running", implement one of:

### Simple: Bash Script + Scheduled Job
```bash
#!/bin/bash
# Deploy pending preview apps

for app in $(supabase select from fly_preview_apps where status='pending'); do
  git clone $app.github_repo_url /tmp/$app.fly_app_name
  cd /tmp/$app.fly_app_name
  git checkout $app.github_branch
  flyctl deploy --app $app.fly_app_name --token $FLY_API_TOKEN
done
```

### Better: Node.js Queue (Bull/RabbitMQ)
```javascript
// lib/preview-queue.js
import Queue from 'bull';

export const previewQueue = new Queue('preview-deployments', {
  redis: process.env.REDIS_URL,
});

previewQueue.process(async (job) => {
  const { projectId, appName } = job.data;
  // Deploy using Fly.io API or CLI
  console.log(`Deploying ${appName}...`);
});
```

### Best: GitHub Actions Workflow
1. User saves code
2. API creates preview record
3. Trigger GitHub Actions workflow to deploy
4. Update status in database when complete

## Status Values

- `pending` - Waiting for deployment
- `initializing` - Deployment in progress
- `running` - Live and accessible
- `stopped` - Marked for deletion
- `error` - Failed to deploy

## Testing

1. **Create a test project** with GitHub URL:
   ```
   https://github.com/belonio2793/currencyph
   ```

2. **Open preview** - should show "Deploying to Fly.io..."

3. **Check database**:
   ```sql
   SELECT * FROM fly_preview_apps 
   WHERE project_id = 'your-project-id';
   ```

4. **Deploy manually** (for testing):
   ```bash
   git clone https://github.com/belonio2793/currencyph /tmp/roseram-test
   cd /tmp/roseram-test
   npm install
   flyctl deploy --app roseram-test --token $FLY_API_TOKEN
   ```

## Troubleshooting

### Preview shows "Provisioning..." indefinitely
- Check Supabase connection in logs
- Verify `fly_preview_apps` table exists
- Look for database errors in server logs

### Can't see app in Fly.io dashboard
- App hasn't been deployed yet (status still `pending`)
- Need to implement deployment mechanism (see "Implement Actual Deployment" above)

### Preview URL returns 404
- Fly.io app hasn't been created yet
- Implement deployment pipeline first

### Auth errors
- Verify Supabase session is active
- Check Bearer token is being sent correctly
- Look at `/api/fly-preview` error logs

## Security

- ✅ RLS: Users only see their own apps
- ✅ Auth: Bearer token required
- ✅ Isolation: Each app is unique per user-project combo
- ✅ No secrets: GitHub tokens not exposed

## Cost Estimate

Once deployed:
- ~$3-5/month per Fly.io app (shared organization plan)
- Bandwidth + compute used
- Can be optimized with reserved compute

## Next Phase: Scale

To handle multiple users/projects:
1. Add background job processor (Bull/RabbitMQ)
2. Implement auto-deployment on save
3. Add health checks and auto-restart
4. Setup monitoring/logging

## Support

For Fly.io specific questions, refer to: https://fly.io/docs/
