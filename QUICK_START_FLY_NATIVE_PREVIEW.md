# Quick Start: Fly.io Native Preview

## TL;DR

### 1. Use the Component (Easiest)

```jsx
import NativeFlyPreview from '@/components/NativeFlyPreview';

export default function PreviewPage() {
  return (
    <div className="w-full h-screen">
      <NativeFlyPreview 
        repo="username/my-repo" 
        branch="main"
      />
    </div>
  );
}
```

That's it! Click "Start Preview on Fly.io" and your app will be live in minutes.

### 2. Use the API (For Custom Integration)

```javascript
// Start preview
const res = await fetch(
  '/api/fly-preview-native?repo=owner/repo&branch=main',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const { preview } = await res.json();
// preview.previewUrl = "https://roseram-abc123.fly.dev"

// Check status
await fetch('/api/fly-preview-native', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ previewId: preview.id, action: 'status' })
});

// Destroy when done
await fetch(`/api/fly-preview-native?previewId=${preview.id}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## How It Works

1. **You provide**: Repository (owner/repo) and branch name
2. **System creates**: A Fly.io app with a unique name
3. **System does**: 
   - Clones your repo
   - Installs dependencies
   - Starts dev server
4. **You get**: Live preview URL like `https://roseram-abc123.fly.dev`

## Component Props

```typescript
interface NativeFlyPreviewProps {
  repo: string;              // "owner/repo" (required)
  branch?: string;           // "main" (default)
  projectId?: string;        // For tracking (optional)
  onStatusChange?: (status: string) => void;
  onUrlChange?: (url: string) => void;
  autoRefresh?: boolean;     // (default: true)
}
```

## Status Values

| Status | Meaning |
|--------|---------|
| `idle` | No preview running |
| `initializing` | Starting deployment |
| `pending` | Waiting for machine |
| `running` | Live and ready |
| `error` | Something went wrong |

## What Gets Deployed?

The system deploys **your repository's dev server**, exactly as-is:

- ✅ Clones your GitHub repo
- ✅ Installs dependencies (npm/yarn/pnpm)
- ✅ Runs `npm run dev` (or custom command)
- ✅ Exposes it at `https://{appName}.fly.dev`

## Authentication

The component needs a user session:

```jsx
import { useAuth } from '@/components/AuthProvider';

export default function PreviewPage() {
  const { session } = useAuth();
  
  if (!session) return <div>Please sign in</div>;
  
  return (
    <NativeFlyPreview repo="owner/repo" branch="main" />
  );
}
```

## Customizing Deployment

### Option 1: Use Default (Simplest)

The system auto-detects your project type and runs:
```bash
npm install
npm run dev
```

### Option 2: Add Config to Your Repo

Create `.roseram/preview.json` in your repo root:

```json
{
  "type": "nextjs",
  "install": "npm install --legacy-peer-deps",
  "build": "npm run build",
  "dev": "npm run dev",
  "port": 3000,
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Troubleshooting

### Preview takes too long
- First deployment installs all dependencies (can take 10+ minutes)
- Subsequent previews reuse the same app (faster)
- Check Fly.io dashboard for actual machine logs

### Deploy fails
- Check your repo has `package.json` with `npm run dev` script
- Verify all dependencies are listed in `package.json`
- Check the logs in component's debug panel

### URL not accessible
- Wait 30+ seconds for machine to fully start
- Check Fly.io dashboard that machine is in "started" state
- Verify you have active internet connection

## Monitoring

### Component logs
Click the dropdown arrow in the preview header to see detailed logs.

### Fly.io dashboard
View full deployment logs:
1. Go to https://fly.io/dashboard
2. Find your app (named like `roseram-abc123`)
3. Click "Logs" tab

## Cleanup

The component has a destroy button (X icon) that:
- Stops the Fly.io app
- Cleans up resources
- Removes from database

You can also destroy via API:
```javascript
await fetch(`/api/fly-preview-native?previewId=${id}`, {
  method: 'DELETE'
});
```

## Cost

Each active preview costs approximately:
- **$2-5/month** for 2 CPU, 512MB RAM machine
- You control how many are running
- Destroyed previews don't cost anything

Check usage on https://fly.io/dashboard → Billing

## Examples

### Example 1: Simple Preview Page

```jsx
// app/preview/page.jsx
'use client';

import NativeFlyPreview from '@/components/NativeFlyPreview';
import { useState } from 'react';

export default function PreviewPage() {
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Fly.io Preview</h1>
        <div className="flex gap-4">
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            className="flex-1 px-3 py-2 border rounded"
          />
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="branch"
            className="px-3 py-2 border rounded"
          />
        </div>
      </div>
      <div className="flex-1">
        {repo ? (
          <NativeFlyPreview repo={repo} branch={branch} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Enter a repository to preview
          </div>
        )}
      </div>
    </div>
  );
}
```

### Example 2: Embedded in Dashboard

```jsx
// In your dashboard component
<div className="grid grid-cols-3 gap-4">
  <NativeFlyPreview 
    repo="my-org/frontend" 
    branch="develop"
    projectId="frontend"
  />
  <NativeFlyPreview 
    repo="my-org/api" 
    branch="develop"
    projectId="api"
  />
</div>
```

### Example 3: With Status Monitoring

```jsx
const [status, setStatus] = useState('idle');
const [url, setUrl] = useState('');

<NativeFlyPreview 
  repo={repo}
  branch={branch}
  onStatusChange={setStatus}
  onUrlChange={setUrl}
/>

{status === 'running' && (
  <a href={url} target="_blank">
    Open Preview
  </a>
)}
```

## Key Differences from Sprites.dev

| Feature | Sprites.dev | Fly.io Native |
|---------|------------|--------------|
| External service | ✅ Yes | ❌ No |
| No external dependencies | ❌ | ✅ Yes |
| Control | Limited | Full |
| Cost transparent | No | Yes (Fly.io) |
| Works offline | No | No (needs GitHub) |
| Works like Builder.io | Sort of | ✅ Exactly |

## Next Steps

1. ✅ Import the component
2. ✅ Add `<NativeFlyPreview />` to a page
3. ✅ Test with your repo
4. ✅ Customize `.roseram/preview.json` if needed
5. ✅ Deploy to production

That's it! You now have a Builder.io-style preview system running directly on Fly.io.
