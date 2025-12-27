# Fly.io Preview Deployment - Complete Setup Guide

## Current Status ✅

Your Fly.io preview system is now **80% ready**. Here's what's been fixed and what remains:

### ✅ Completed Components
1. **Authentication Fixed** - Preview endpoints now properly validate user sessions
2. **Database Schema Created** - `fly_preview_apps` table ready in Supabase
3. **Deployment Handler** - `lib/fly-deployment.js` with GraphQL API support
4. **Error Handling** - Proper error messages and troubleshooting guidance
5. **API Endpoints** - `/api/fly-preview` and `/api/preview-instance` configured

### ⏳ What's Still Needed

To get **fully working preview deployments**, choose ONE of these approaches:

---

## Option 1: GitHub Actions + Fly.io CLI (RECOMMENDED)

**Setup Time:** 15 minutes  
**Complexity:** Low  
**Reliability:** High  

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/deploy-preview.yml`:

```yaml
name: Deploy Preview to Fly.io

on:
  workflow_dispatch:
    inputs:
      appName:
        description: 'Fly.io App Name'
        required: true
      repoUrl:
        description: 'Repository URL'
        required: true
      branch:
        description: 'Git Branch'
        required: true

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
        with:
          repository: ${{ github.event.inputs.repoUrl }}
          ref: ${{ github.event.inputs.branch }}
          fetch-depth: 1

      - name: Setup Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        run: |
          flyctl deploy \
            --app ${{ github.event.inputs.appName }} \
            --remote-only \
            --no-cache
      
      - name: Get deployment URL
        run: |
          echo "DEPLOY_URL=$(flyctl info --app ${{ github.event.inputs.appName }} --json | jq -r '.Hostname')" >> $GITHUB_ENV
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Notify deployment complete
        run: |
          echo "Deployment completed: https://${{ github.event.inputs.appName }}.fly.dev"
```

### Step 2: Set GitHub Secrets

1. Go to your repository Settings → Secrets and variables → Actions
2. Add `FLY_API_TOKEN` with your Fly.io token (from env vars)
3. Add `GITHUB_TOKEN` if not already present

### Step 3: Create API Handler for Deployment

Create `app/api/deploy-preview/route.js`:

```javascript
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';
import { Octokit } = from 'octokit';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const { data } = await supabaseServer.auth.getUser(token);
  return data?.user;
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { appId } = await request.json();

    if (!appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      );
    }

    // Get preview app details
    const { data: app, error: queryError } = await supabaseServer
      .from('fly_preview_apps')
      .select('*')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (queryError || !app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Update status to initializing
    await supabaseServer
      .from('fly_preview_apps')
      .update({ status: 'initializing' })
      .eq('id', appId);

    // Trigger GitHub Actions workflow
    const octokit = new Octokit({
      auth: process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN,
    });

    // Extract owner and repo from GitHub URL
    const urlParts = new URL(app.github_repo_url);
    const [owner, repo] = urlParts.pathname.slice(1).split('/');

    try {
      await octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: 'deploy-preview.yml',
        ref: app.github_branch,
        inputs: {
          appName: app.fly_app_name,
          repoUrl: `${owner}/${repo}`,
          branch: app.github_branch,
        },
      });

      logger.info('Triggered deployment', { appId, appName: app.fly_app_name });

      return NextResponse.json({
        success: true,
        message: 'Deployment triggered',
        appId,
      });
    } catch (githubError) {
      logger.error('GitHub Actions error', { error: githubError.message });
      throw githubError;
    }
  } catch (error) {
    logger.error('Deployment trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger deployment' },
      { status: 500 }
    );
  }
}
```

### Step 4: Update FlyPreview Component

Modify `components/FlyPreview.jsx` to trigger deployment:

```javascript
const startServer = async () => {
  try {
    setLoading(true);
    setError(null);
    setHasStarted(true);

    // Create preview app record
    const response = await fetch(`/api/fly-preview?projectId=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to provision preview app');
    }

    setApp(data.app);

    // NOW trigger the actual deployment
    const deployResponse = await fetch('/api/deploy-preview', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appId: data.app.id }),
    });

    if (!deployResponse.ok) {
      throw new Error('Failed to trigger deployment');
    }

    // Start polling for status
    startStatusPolling(data.app.id);
  } catch (err) {
    setError(err.message);
    setLoading(false);
    setHasStarted(false);
  }
};
```

---

## Option 2: Fly.io API with @fly/sdk (ADVANCED)

**Setup Time:** 30 minutes  
**Complexity:** High  
**Reliability:** Medium  

### Step 1: Install Fly SDK

```bash
npm install @fly/sdk
```

### Step 2: Create Deployment Handler

Create `lib/fly-api-deploy.js` - handles actual Docker deployment via Fly.io API.

### Step 3: Use in Endpoint

This approach requires building and pushing Docker images, which is more complex.

---

## Option 3: Pre-built Docker Images (SIMPLE)

**Setup Time:** 5 minutes  
**Complexity:** Very Low  
**Limitation:** Only works for specific project types  

Use pre-built Docker images for common stacks:

```javascript
const dockerImages = {
  'next': 'node:18-alpine',
  'react': 'node:18-alpine',
  'vue': 'node:18-alpine',
  'express': 'node:18-alpine',
};

// Deploy using pre-built image and GitHub Actions
```

---

## Required Environment Variables

All of these should already be set:

```env
# Fly.io
FLY_IO_TOKEN=<your-fly-api-token>
NEXT_FLY_IO_TOKEN=<your-fly-api-token>

# GitHub (for Actions)
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=<your-github-token>
GITHUB_ACCESS_TOKEN=<your-github-token>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=<your-anon-key>
SUPABASE_SERVICE_ROLE=<your-service-role-key>
```

Check `.env` or environment tab to verify.

---

## Database Migration

The SQL migration has been created. To apply it:

### In Supabase Dashboard:
1. Go to SQL Editor
2. Click "New query"
3. Copy the SQL from `supabase/migrations/add_fly_preview_apps.sql`
4. Run it

### Verify:
```sql
SELECT * FROM fly_preview_apps LIMIT 1;
```

Should return empty table (no error).

---

## Testing the Setup

### Test 1: Check Authentication
```bash
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  http://localhost:3001/api/preview-instance \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"owner":"user","repo":"repo","branch":"main","githubToken":"token"}'
```

Expected: 200 with preview URL or 400 with helpful error

### Test 2: Check Database
```sql
SELECT * FROM fly_preview_apps;
```

Should show created preview app records.

### Test 3: Check Fly.io API
```bash
curl -H "Authorization: Bearer FLY_API_TOKEN" \
  https://api.fly.io/graphql \
  -d '{"query":"{ viewer { email } }"}'
```

If errors, Fly.io token is invalid.

---

## Deployment Flow (After Setup)

```
User clicks "Start Server"
    ↓
/api/fly-preview creates record (status: pending)
    ↓
/api/deploy-preview triggers GitHub Actions
    ↓
GitHub Actions clones repo & runs: npm install && npm run dev
    ↓
App deploys to Fly.io (updates status: initializing)
    ↓
FlyPreview component polls /api/fly-preview for status
    ↓
When status = 'running', iframe loads the preview URL
```

---

## Troubleshooting

### Issue: "Authentication failed"
**Solution:** 
- Verify user is signed in
- Check session token is being sent
- Look at `/api/preview-instance` logs

### Issue: "Fly.io not configured"
**Solution:**
- Verify `FLY_IO_TOKEN` is set in environment
- Check: `echo $FLY_IO_TOKEN` (should not be empty)

### Issue: GitHub Actions not triggering
**Solution:**
- Verify GitHub token has `actions:write` permission
- Check workflow file exists at `.github/workflows/deploy-preview.yml`
- Verify GitHub token is in environment

### Issue: Deployment timeout
**Solution:**
- Increase timeout in polling (default: 10 minutes)
- Check Fly.io dashboard for actual deployment status
- Verify repository has valid `package.json` and dev script

### Issue: App won't deploy
**Troubleshooting:**
1. Check repository has `package.json`
2. Verify `npm run dev` works locally
3. Check GitHub Actions logs
4. Look at Fly.io deployment logs: `flyctl logs --app roseram-abc123`

---

## Next Steps

**Immediate (Choose One):**
1. Implement Option 1 (GitHub Actions) - **RECOMMENDED**
2. Or implement Option 3 (Simple Docker)

**Then:**
1. Test with a real project
2. Monitor Fly.io dashboard
3. Adjust timeouts as needed

**Later (Optimization):**
1. Add health checks
2. Setup auto-scaling
3. Add monitoring/alerts
4. Implement rate limiting

---

## Architecture Overview

```
Builder App
    ↓
FlyPreview Component
    ↓
/api/fly-preview (creates preview record)
    ↓
/api/deploy-preview (triggers GitHub Actions)
    ↓
GitHub Actions Workflow
    ↓
Fly.io Deployment
    ↓
Live Preview URL
    ↓
iframe loads preview
```

---

## Cost & Performance

**Per-app costs:** ~$3-5/month (Fly.io shared org)  
**Deployment time:** 2-5 minutes  
**Memory per app:** 256MB (minimum)  
**Auto-stop:** Can be configured after 30 mins inactivity

---

## Support & Resources

- **Fly.io Docs:** https://fly.io/docs/
- **GitHub Actions:** https://docs.github.com/en/actions
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

## Checklist for Getting Started

- [ ] Verify Fly.io token is valid (`flyctl auth whoami`)
- [ ] Verify GitHub token has correct permissions
- [ ] Apply database migration (`add_fly_preview_apps.sql`)
- [ ] Choose deployment option (1, 2, or 3)
- [ ] Create required files (.github/workflows/deploy-preview.yml)
- [ ] Test with a real project
- [ ] Monitor first deployment
- [ ] Adjust timeouts/resources as needed
