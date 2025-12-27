# Explicit Runtime Contract for roseram-builder

**Status**: ✅ No guessing. Explicit contract in place.

## Contract Definition
This is the **single source of truth** for how this application runs.

```json
{
  "type": "node",
  "framework": "nextjs",
  "install": "npm install",
  "dev": "npm run dev",
  "port": 3001,
  "host": "0.0.0.0"
}
```

## Implementation Details

### 1. Stack Detection ✅
- **Language**: JavaScript/Node.js
- **Framework**: Next.js 14
- **Package Manager**: npm
- **Node Version**: 20+

**Detection Method**: Inspected repository for:
- ✅ package.json (explicit)
- ✅ next.config.js (explicit)
- No guessing; facts from actual files

### 2. Dev Environment ✅
**File**: `Dockerfile.dev`
- Installs all dependencies (including dev)
- Does NOT build
- Runs dev server continuously
- Listens on `0.0.0.0:3001`

**File**: `scripts/dev-server.sh`
- Respects `PORT` environment variable
- Binds to `0.0.0.0` (all interfaces)
- Fallback to port 3001 if PORT not set

### 3. Fly Configuration ✅
**File**: `fly.toml`
- `dockerfile = "Dockerfile.dev"` (not production Dockerfile)
- `NODE_ENV = "development"`
- `processes.app = "npm run dev"` (not `npm run start`)
- Port 3001 exposed and mapped

### 4. Package Scripts ✅
**File**: `package.json`
```json
"dev": "bash scripts/dev-server.sh"
```
- No hardcoded ports
- Respects `PORT` environment variable
- Binds to all interfaces (`-H 0.0.0.0`)

## Fly.io Machine Flow
```
1. Boot Dockerfile.dev
2. npm install (installs dependencies)
3. npm run dev (starts Next.js dev server)
4. Server listens on 0.0.0.0:3001
5. Fly exposes port 3001 as public URL
6. IDE preview loads that URL
7. Dev server stays running (long-lived)
```

## No More Auto-Detection
Previously:
- ❌ Guessed "probably npm"
- ❌ Assumed "npm run dev"
- ❌ Hardcoded localhost
- ❌ Tried to "auto-preview"

Now:
- ✅ Explicit contract in `.roseram/preview.json`
- ✅ Explicit dev Dockerfile
- ✅ Environment variables control port
- ✅ Proper interface binding (0.0.0.0)
- ✅ Long-running dev server (not build artifact)

## This Works For
- Next.js ✅ (confirmed)
- Any Node.js framework (modify contract)
- Python + FastAPI (create Python contract)
- Rails/Django (create respective contract)
- Go/Rust (create respective contract)

Just:
1. Inspect the repo
2. Create/update `.roseram/preview.json`
3. Create appropriate Dockerfile.<type>
4. Fly.io runs it
5. Port exposed as preview URL

## Environment Requirements
Set these in Fly.io secrets (for Supabase connection):
- `NEXT_PUBLIC_SUPABASE_PROJECT_URL`
- `NEXT_PUBLIC_SUPABASE_ANON`
- `SUPABASE_SERVICE_ROLE`
- Any API keys (X.ai, GitHub, Stripe, etc.)

## Verification
Run locally:
```bash
npm install
npm run dev
# Should listen on 0.0.0.0:3001
```

Or via Fly:
```bash
fly deploy --dockerfile=Dockerfile.dev
# Fly machine boots, installs, runs dev server
# Visit public preview URL
```

## Summary
✅ **Explicit contract established**
✅ **Stack: Node.js + Next.js**
✅ **Dev server: Long-running, not build artifact**
✅ **Port: Dynamic (respects PORT env var)**
✅ **Interface: 0.0.0.0 (all interfaces)**
✅ **Preview: URL exposed from Fly machine**
✅ **No guessing**
