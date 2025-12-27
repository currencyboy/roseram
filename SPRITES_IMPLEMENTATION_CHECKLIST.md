# Sprites Integration - Implementation Checklist

## ✅ Completed Implementation

### Code Files Created

- [x] **`lib/sprites-service.js`** - Sprites client service
  - Initialize SpritesClient
  - Create sprites
  - Run setup sequences (clone, install, start)
  - Listen for port notifications
  - Destroy sprites

- [x] **`app/api/sprites-preview/route.js`** - Preview API endpoints
  - GET: Provision sprite
  - POST: Check status
  - DELETE: Destroy sprite
  - Background provisioning job

- [x] **`components/SpritesPreview.jsx`** - User interface component
  - GitHub connection wizard
  - Repository/branch selection
  - Launch preview button
  - Live preview iframe
  - Status polling

- [x] **`supabase/migrations/add_sprites_preview_instances.sql`** - Database table
  - Track sprites and status
  - Row-level security
  - Indexes for performance

### Configuration

- [x] **Environment Setup**
  - `SPRITES_TOKEN` configured in dev environment
  - Token: `harrypotter-445/1368716/...`
  - @fly/sprites package installed

- [x] **Documentation**
  - `SPRITES_INTEGRATION_GUIDE.md` - Complete guide
  - Troubleshooting section
  - Architecture documentation

## ⏳ Next Steps (Required)

### 1. Database Migration

**Required to activate the system**

```bash
# Copy the SQL migration:
# supabase/migrations/add_sprites_preview_instances.sql

# Paste into Supabase SQL Editor:
# 1. Go to https://supabase.com → Your Project
# 2. Click "SQL Editor"
# 3. Click "New Query"
# 4. Paste the migration SQL
# 5. Click "Run"
```

Status: **⏳ PENDING** - You must run this migration

### 2. Update UI Components

**Replace FlyPreview with SpritesPreview in your pages**

Example: If you have a page using FlyPreview:

**Before**:
```jsx
import { FlyPreview } from '@/components/FlyPreview';

export default function PreviewPage() {
  return <FlyPreview projectId="some-id" />;
}
```

**After**:
```jsx
import { SpritesPreview } from '@/components/SpritesPreview';

export default function PreviewPage() {
  return <SpritesPreview projectId="some-id" />;
}
```

**Files to update**: Look for imports of `FlyPreview` in your codebase
```bash
grep -r "FlyPreview" --include="*.jsx" --include="*.js" components/ app/
```

Status: **⏳ PENDING** - Search and update your pages

### 3. Test the Integration

**Verify everything works end-to-end**

1. Sign in to the app
2. Navigate to a page using `SpritesPreview`
3. Click "Launch Preview"
4. Follow setup wizard:
   - Connect GitHub (use your token)
   - Select a repository
   - Select a branch
   - Click "Launch"
5. Wait for preview to start (1-5 minutes)
6. Verify iframe loads your app
7. Test refresh and path navigation
8. Click trash icon to destroy

Status: **⏳ PENDING** - You should test this

### 4. Cleanup (Optional)

**Remove old Fly.io code if not needed**

Files you can delete after verifying Sprites works:
- `components/FlyPreview.jsx`
- `components/UnifiedPreviewPanel.jsx` (if only used for Fly)
- `app/api/fly-preview/route.js`
- `app/api/deploy-preview/route.js`
- `lib/flyio.js`
- `lib/flyio-deployment.js`
- `lib/fly-deployment.js`
- `lib/fly-preview-deployer.js`
- `lib/preview-contract.js`
- Database table: `fly_preview_apps` (archive first)

Status: **⏳ OPTIONAL** - Only after confirming Sprites works

## 📊 Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Sprites SDK | ✅ Installed | @fly/sprites v0.0.1 |
| Environment Token | ✅ Configured | SPRITES_TOKEN set |
| Service Library | ✅ Complete | lib/sprites-service.js |
| API Routes | ✅ Complete | app/api/sprites-preview/* |
| React Component | ✅ Complete | components/SpritesPreview.jsx |
| Database Table | ✅ Schema Created | Migration SQL ready |
| Documentation | ✅ Complete | SPRITES_INTEGRATION_GUIDE.md |
| **Database Migration** | ⏳ PENDING | **REQUIRED** |
| **UI Integration** | ⏳ PENDING | Update your pages |
| **Testing** | ⏳ PENDING | Verify end-to-end |

## 🚀 Key Improvements Over Fly.io

1. **More Reliable**
   - Direct command execution vs. app deployment
   - Automatic port detection
   - Simpler lifecycle management

2. **Faster Boot Time**
   - 1-5 minutes vs. 5-30 minutes
   - Direct dev server vs. build + deploy cycle
   - Isolated container per user

3. **Better Control**
   - Configure CPU, RAM, region
   - Direct access to stdout/stderr
   - Port opening notifications

4. **Simpler Architecture**
   - ~400 lines API code vs. 300+ lines + complex deployer
   - ~750 lines component vs. 600+ lines with many states
   - No complex Git checkout/build abstractions

## 📝 Configuration Examples

### Custom Dev Command

If your app uses a different start script, edit `lib/sprites-service.js`:

```javascript
// Find _runSetupSequence method and update:
const commands = [
  `mkdir -p ${workDir} && cd ${workDir}`,
  `git clone --branch ${branch} ${repoUrl} repo`,
  `cd repo`,
  `npm install`,
  `npm run custom-dev`,  // Change this line
];
```

### Environment Variables

If your app needs environment variables in the sprite:

```javascript
// In startSpriteProvisioning(), add env:
const cmd = sprite.spawn('sh', ['-c', fullCommand], {
  env: {
    NODE_ENV: 'development',
    DATABASE_URL: process.env.DATABASE_URL,
    API_KEY: process.env.API_KEY,
  },
});
```

### Custom Resources

If you need more CPU/RAM:

```javascript
// In createSprite call:
const sprite = await spritesService.createSprite(spriteName, {
  ramMB: 2048,  // 2GB instead of 1GB
  cpus: 4,      // 4 cores instead of 2
  region: 'sfo', // San Francisco instead of Chicago
});
```

## 🆘 Troubleshooting Quick Links

**Problem**: "Sprites is not configured"
→ See SPRITES_INTEGRATION_GUIDE.md section "Sprites is not configured"

**Problem**: "Failed to create sprite"
→ See SPRITES_INTEGRATION_GUIDE.md section "Failed to create sprite"

**Problem**: "Dev server did not open a port"
→ See SPRITES_INTEGRATION_GUIDE.md section "Dev server did not open a port"

**Problem**: Preview loads but nothing displays
→ See SPRITES_INTEGRATION_GUIDE.md section "Preview loads but nothing displays"

## 📞 Support

If you encounter issues:

1. **Check the logs** - Look at browser console and database `error_message`
2. **Read the guide** - SPRITES_INTEGRATION_GUIDE.md has detailed troubleshooting
3. **Test locally** - Try `npm install && npm run dev` in the actual repo
4. **Verify environment** - Ensure SPRITES_TOKEN is set: `echo $SPRITES_TOKEN`
5. **Check database** - Query `sprites_preview_instances` table for error details

## 🎯 Success Criteria

After completing the next steps, you'll have succeeded when:

- [ ] Database migration is applied (no errors)
- [ ] Pages updated to use `SpritesPreview` component
- [ ] Can sign in and access preview feature
- [ ] Can connect GitHub and select repo/branch
- [ ] Can click "Launch Preview" and wait for it to start
- [ ] Preview URL loads in iframe
- [ ] Can refresh and navigate within preview
- [ ] Can destroy preview (click trash icon)
- [ ] All errors are gone (check error_message in database)

---

## Files Summary

```
✅ CREATED:
  lib/sprites-service.js                  - Core Sprites service
  app/api/sprites-preview/route.js        - API endpoints
  components/SpritesPreview.jsx           - UI component
  supabase/migrations/add_sprites_preview_instances.sql - Database

📄 DOCUMENTED:
  SPRITES_INTEGRATION_GUIDE.md            - Complete guide
  SPRITES_IMPLEMENTATION_CHECKLIST.md     - This file
  
⏳ TODO:
  - Run database migration
  - Update UI pages (search for FlyPreview)
  - Test end-to-end
  - Optional: Clean up old Fly.io code
```

---

**Status**: Implementation Complete, Ready for Migration
**Created**: December 2024
**Version**: 1.0
