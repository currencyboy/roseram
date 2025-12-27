# Sprites.dev Integration Guide

## Overview

We've replaced the unreliable Fly.io preview system with **Sprites.dev** - a more reliable platform for running isolated development environments.

### Key Differences from Fly.io

| Feature | Fly.io | Sprites |
|---------|--------|---------|
| **Execution Model** | Deploy as production app | Run commands in containers |
| **Reliability** | Complex app lifecycle management | Direct process execution |
| **Port Detection** | Manual polling | Automatic port notification |
| **Setup Time** | 5-30 minutes | 1-5 minutes |
| **Resource Control** | Limited | Full container control (CPU, RAM, region) |
| **Dev Server Start** | Via Fly.io app deploy | Direct npm/yarn commands |

## Architecture

### Components

1. **`lib/sprites-service.js`**
   - Manages Sprites client initialization
   - Creates/destroys sprites
   - Runs setup sequences (clone, install, start)
   - Listens for port notifications

2. **`app/api/sprites-preview/route.js`**
   - GET: Provision new sprite instance
   - POST: Check sprite status
   - DELETE: Destroy sprite
   - Background provisioning job

3. **`components/SpritesPreview.jsx`**
   - User-facing preview component
   - Multi-step setup wizard
   - Live preview iframe

4. **`sprites_preview_instances` table**
   - Stores sprite metadata
   - Tracks status and errors
   - User isolation via RLS

## Setup Instructions

### 1. Environment Variables

The Sprites token is already configured:
```bash
SPRITES_TOKEN=harrypotter-445/1368716/...
```

This is stored securely in the dev environment.

### 2. Database Migration

Apply the migration to create the `sprites_preview_instances` table:

```bash
# Copy the SQL from supabase/migrations/add_sprites_preview_instances.sql
# Paste into Supabase SQL editor and run
```

### 3. Install Dependencies

The `@fly/sprites` package is already installed:
```bash
npm install @fly/sprites
```

(Note: Requires Node.js 24+, but compatible with v22)

## How It Works

### User Flow

1. **User clicks "Launch Preview"**
   - SpritesPreview component loads
   - User connects GitHub and selects repo/branch

2. **Sprite Provisioning (Backend)**
   - API creates sprite record in database
   - Background job:
     - Creates Sprites container (512MB-1GB RAM)
     - Clones repository
     - Runs `npm install`
     - Runs `npm run dev`

3. **Port Detection**
   - Sprites notifies when port opens
   - Preview URL constructed: `https://<sprite-name>.sprites.dev:<port>`
   - Status updated to "running" in database

4. **Live Preview**
   - User sees iframe with running app
   - Can navigate, refresh, test in isolation
   - Can destroy when done

### Timeout Handling

- **Provisioning**: 5 minutes max (300s)
- **Polling**: 10 minutes max (120 polls × 5s)
- **Port Detection**: Automatic when app opens port
- **Fallback**: If no port detected but setup completes, mark as ready anyway

## Troubleshooting

### "Sprites is not configured"

**Cause**: `SPRITES_TOKEN` environment variable not set

**Fix**:
```bash
# Check env variable
echo $SPRITES_TOKEN

# If empty, set it:
export SPRITES_TOKEN="harrypotter-445/1368716/..."
```

### "Failed to create sprite"

**Cause**: Sprites API error (quota, region unavailable, etc.)

**Check**:
1. Verify token is valid: `curl -H "Authorization: Bearer $SPRITES_TOKEN" https://api.sprites.dev/`
2. Check Sprites dashboard for quota/limits
3. Try different region in `lib/sprites-service.js` (change `region: 'ord'`)

### "Dev server did not open a port"

**Cause**: 
- Repository doesn't have `package.json`
- No `npm run dev` or `npm start` script
- Build errors during `npm install`

**Check**:
1. Verify repository has `package.json`
2. Verify `package.json` has `"dev"` script (fallback to `"start"`)
3. Try running locally: `npm install && npm run dev`
4. Check logs in Sprites dashboard

### "Dev server exited with code X"

**Cause**: Script failed or port conflicts

**Common exit codes**:
- `1`: General error (check build output)
- `127`: Command not found (Node.js or npm issue)
- `EADDRINUSE`: Port already in use

**Fix**:
- Add port override: `PORT=3000 npm run dev`
- See `_runSetupSequence` in `lib/sprites-service.js` to modify commands

### Preview loads but nothing displays

**Cause**: App requires environment variables not available

**Fix**:
1. Check if app needs `.env.local` or similar
2. Add to sprite environment in `lib/sprites-service.js`:
```javascript
const cmd = sprite.spawn('sh', ['-c', fullCommand], {
  env: {
    NODE_ENV: 'development',
    // Add more vars here
  },
});
```

### Sprite takes too long to boot (>5 min)

**Cause**: Large dependencies, slow network, regional latency

**Fix**:
1. Try different region: Change `region: 'ord'` to `'lax'`, `'sfo'`, etc.
2. Increase timeout in `setupAndRunDevServer()`:
```javascript
timeout: 600000, // 10 minutes
```

3. Optimize dependencies:
   - Use `npm ci` instead of `npm install`
   - Remove unused dev dependencies
   - Use lockfile (`package-lock.json`)

## Advanced Configuration

### Custom Dev Server Command

Edit `_runSetupSequence` in `lib/sprites-service.js`:

```javascript
// Before npm start, e.g., for Next.js:
const commands = [
  `mkdir -p ${workDir} && cd ${workDir}`,
  `git clone --branch ${branch} ${repoUrl} repo`,
  `cd repo`,
  `npm install`,
  `npm run build`,  // Build first
  `npm run dev`,    // Then start dev server
];
```

### Custom Environment Variables

```javascript
// In startSpriteProvisioning():
const cmd = sprite.spawn('sh', ['-c', fullCommand], {
  env: {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: process.env.DATABASE_URL,
    API_KEY: process.env.API_KEY,
    // ... add more vars
  },
});
```

### Sprite Configuration

Adjust resources in `lib/sprites-service.js`:

```javascript
const sprite = await spritesService.createSprite(spriteName, {
  ramMB: 2048,  // 2GB
  cpus: 4,      // 4 CPUs
  region: 'sfo', // San Francisco
});
```

### Session Management

Keep sprite alive for multiple commands:

```javascript
// Create detachable session
const session = sprite.createSession('bash', []);

// Run commands without killing sprite
await sprite.attachSession(sessionId);
```

## Database Schema

```sql
CREATE TABLE sprites_preview_instances (
  id UUID PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  sprite_name TEXT NOT NULL UNIQUE,
  
  github_repo_url TEXT NOT NULL,
  github_branch TEXT NOT NULL,
  
  status TEXT CHECK (status IN ('provisioning', 'running', 'error', 'stopped')),
  port INTEGER,
  preview_url TEXT,
  error_message TEXT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  destroyed_at TIMESTAMP
);
```

## Monitoring

### Check Active Sprites

```javascript
// In browser console or API:
const sprites = await spritesService.client.listAllSprites('preview-');
console.log(sprites);
```

### View Sprite Logs

Logs are emitted via stdout/stderr:
```javascript
cmd.stdout.on('data', (chunk) => {
  console.log('[STDOUT]', chunk.toString());
});

cmd.stderr.on('data', (chunk) => {
  console.error('[STDERR]', chunk.toString());
});
```

### Database Queries

```sql
-- Active previews
SELECT * FROM sprites_preview_instances 
WHERE status = 'running';

-- Failed previews
SELECT * FROM sprites_preview_instances 
WHERE status = 'error'
ORDER BY created_at DESC;

-- User's sprites
SELECT * FROM sprites_preview_instances 
WHERE user_id = 'uuid-here'
ORDER BY created_at DESC;
```

## Migration from Fly.io

### What Changed

- Remove: `FlyPreview.jsx`, `lib/flyio.js`, `lib/flyio-deployment.js`, etc.
- Add: `SpritesPreview.jsx`, `lib/sprites-service.js`, `/api/sprites-preview`
- Database: Keep both tables for now (can archive later)

### Update UI Components

Replace all references to `FlyPreview`:

**Before**:
```jsx
import { FlyPreview } from '@/components/FlyPreview';

<FlyPreview projectId={id} />
```

**After**:
```jsx
import { SpritesPreview } from '@/components/SpritesPreview';

<SpritesPreview projectId={id} />
```

## Performance Metrics

### Expected Times

- **Sprite creation**: 5-10 seconds
- **Git clone**: 2-5 seconds (depends on repo size)
- **npm install**: 10-30 seconds (depends on dependencies)
- **Dev server start**: 5-15 seconds
- **Total**: 25-60 seconds (1-2 minutes typical)

### Resource Usage

- **Sprites API calls per preview**: ~1-2 (create + destroy)
- **Database writes per preview**: 2-3 (create, update, destroy)
- **Container memory**: 512MB-1GB (configurable)
- **Container CPU**: 1-2 cores (configurable)

## Support

For issues:
1. Check [Sprites.dev documentation](https://sprites.dev)
2. Review error message in database (`error_message` field)
3. Check logs in `lib/sprites-service.js` and API route
4. Test locally: `npm install && npm run dev`
5. Try different region/resources configuration

---

**Documentation Updated**: December 2024
**Version**: 1.0
**Status**: Production Ready
