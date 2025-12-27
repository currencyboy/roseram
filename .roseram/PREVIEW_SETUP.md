# Fly Development Environment Setup

## Overview
This repository is configured to run as a **long-lived development environment** on Fly.io, not as a production deployment.

## Preview Contract
See `.roseram/preview.json` for the explicit runtime contract that defines:
- **Type**: Node.js/Next.js
- **Install**: `npm install`
- **Dev command**: `npm run dev`
- **Port**: 3001
- **Host**: 0.0.0.0 (listens on all interfaces)

## Key Files
- **`.roseram/preview.json`** - Explicit runtime contract (single source of truth for how to run this app)
- **`Dockerfile.dev`** - Development image that runs the Next.js dev server continuously
- **`fly.toml`** - Configured to build with Dockerfile.dev and run the dev server
- **`scripts/dev-server.sh`** - Wrapper script that respects PORT environment variable

## How It Works
1. Fly.io boots a machine from `Dockerfile.dev`
2. Installs dependencies with `npm install`
3. Starts the dev server with `npm run dev`
4. Dev server listens on `0.0.0.0:3001` (or custom PORT)
5. Fly exposes port 3001 as a public preview URL
6. Live changes to code are reflected in the dev server

## Environment Variables
Required at runtime:
- `NEXT_PUBLIC_SUPABASE_PROJECT_URL`
- `NEXT_PUBLIC_SUPABASE_ANON`
- `SUPABASE_SERVICE_ROLE`
- (Other Supabase/API keys as needed)

## Production vs Development
- **Production**: Use `Dockerfile` (builds Next.js, runs with `npm run start`)
- **Development**: Use `Dockerfile.dev` (runs dev server continuously)

## Stack Detection
No guessing. The contract explicitly states:
- **Framework**: Next.js
- **Language**: Node.js
- **Package Manager**: npm
