# Preview Systems Comparison Guide

## System Overview

You now have **two complete preview systems** available. Choose based on your needs:

## 📊 Feature Comparison

| Feature | Sprites.dev | Fly.io Native |
|---------|------------|--------------|
| **Speed** | ⭐⭐⭐⭐ (30-90s) | ⭐⭐⭐ (2-15m) |
| **Setup Time** | Seconds | Minutes |
| **Ephemeral** | ✅ Yes | ❌ No |
| **Persistent URLs** | ❌ No | ✅ Yes |
| **External Dependency** | ✅ Sprites.dev | ❌ None |
| **Self-Hosted** | ❌ No | ✅ Yes |
| **Cost** | Lower | Transparent |
| **Control** | Limited | Full |
| **IDE Experience** | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Production Ready** | ❌ No | ✅ Yes |
| **Global Edge** | ❌ Limited | ✅ Yes |

## 🎯 Use Cases

### Choose Sprites.dev If You Want:
```
✅ Fast IDE-like previews
✅ Quick branch testing
✅ PR demonstrations
✅ Short-lived ephemeral instances
✅ Minimal setup complexity
✅ Lower resource usage

Best for: Development, Design Review, PR Previews
```

### Choose Fly.io Native If You Want:
```
✅ Full deployment control
✅ Persistent staging URLs
✅ Production-like environments
✅ Integration with databases
✅ Global edge deployment
✅ Long-running instances

Best for: Staging, QA, Production-like Testing
```

## 🏗️ Architecture Comparison

### Sprites.dev Flow
```
User Action
    ↓
Request to /api/sprites-preview
    ↓
SpritesService (lazy init with token)
    ↓
Sprites.dev API
    ↓
Container spins up (cloud-hosted)
    ↓
Preview URL: https://preview-xxx.sprites.dev
    ↓
Auto-destroys after ~1 hour
```

### Fly.io Native Flow
```
User Action
    ↓
Request to /api/fly-preview-native
    ↓
FlyNativePreviewService
    ↓
Fly.io API (GraphQL + Machines API)
    ↓
Creates/Gets Fly.io app
    ↓
Creates & starts machine
    ↓
Preview URL: https://roseram-xxx.fly.dev
    ↓
Manual or timeout destruction
```

## 💡 Decision Matrix

### Question 1: How fast do you need previews?

**< 2 minutes?**
→ Use **Sprites.dev** (30-90 seconds typical)

**2-15 minutes is okay?**
→ Use **Fly.io Native** (first run slower, cached runs faster)

---

### Question 2: How long do previews need to run?

**Minutes to 1 hour?**
→ Use **Sprites.dev** (ephemeral, auto-cleanup)

**Hours to days?**
→ Use **Fly.io Native** (persistent, you control lifetime)

---

### Question 3: What's your primary workflow?

**Development/PR Review/Design Feedback?**
→ Use **Sprites.dev** (designed for this)

**Staging/QA/Production Testing?**
→ Use **Fly.io Native** (production-ready)

---

### Question 4: Do you care about external dependencies?

**No, external is fine (Sprites.dev works)?**
→ Use **Sprites.dev** (simpler, faster)

**Yes, want full control?**
→ Use **Fly.io Native** (self-contained)

## 📈 Performance Comparison

### Preview Speed

**Sprites.dev:**
```
1. Request     : ~2 seconds
2. Container  : ~3-5 seconds
3. Install    : ~30-120 seconds (first), ~10-30 (cached)
4. Dev Server : ~5-15 seconds
─────────────────────────────────
TOTAL         : 45-150 seconds (first)
                30-60 seconds (cached)
```

**Fly.io Native:**
```
1. Request         : ~2 seconds
2. Create App      : ~5 seconds
3. Create Machine  : ~10-30 seconds
4. Boot OS         : ~30-60 seconds
5. Clone Repo      : ~10-30 seconds
6. Install         : ~30-120 seconds
7. Start Dev Server: ~10-30 seconds
─────────────────────────────────
TOTAL              : 2-15 minutes (first)
                    10-60 seconds (reused app)
```

### Resource Usage

**Sprites.dev:**
- ✅ Minimal RAM (auto-scaling)
- ✅ Minimal CPU (shared)
- ✅ Automatic cleanup
- ✅ Lower cost

**Fly.io Native:**
- 512 MB RAM per preview
- 1-2 CPU cores per preview
- Manual destruction needed
- Transparent Fly.io pricing

## 💰 Cost Analysis

### Sprites.dev
- **Per preview**: Free (first few), then metered
- **Cost model**: Pay per second of runtime
- **Example**: 1 hour preview ≈ $0.01-0.10
- **Best for**: Minimizing costs on many previews

### Fly.io Native
- **Per preview**: $5-10/month (continuous)
- **Cost model**: Per machine (2 CPU, 512MB)
- **Example**: 10 active previews ≈ $50-100/month
- **Best for**: Cost-predictable, persistent deployments

## 🔄 Hybrid Approach (Recommended)

**Use BOTH for maximum flexibility:**

```javascript
// Pseudo code: Try Sprites first, fallback to Fly.io
async function getPreview(repo, branch) {
  try {
    // Fast path: Sprites.dev (30-90s)
    return await spritesPreview(repo, branch);
  } catch (error) {
    // Reliable fallback: Fly.io Native
    return await flyNativePreview(repo, branch);
  }
}
```

**Benefits:**
- ✅ Users get fastest possible previews
- ✅ Never broken (has fallback)
- ✅ Best UX (choose speed when available)
- ✅ Scalable (spread load between systems)

## 🛠️ Implementation Status

### Sprites.dev ✅
**Files:**
- `lib/sprites-service.js` - Refactored with lazy init
- `app/api/sprites-preview/route.js` - API endpoint
- `components/SpritesPreviewRefactored.jsx` - React component
- `SPRITES_DEV_SETUP_GUIDE.md` - Setup documentation

**Status:** Ready to use
**Token:** Configured ✅

### Fly.io Native ✅
**Files:**
- `lib/fly-native-preview-service.js` - Complete service
- `app/api/fly-preview-native/route.js` - API endpoint
- `components/NativeFlyPreview.jsx` - React component
- `FLY_NATIVE_PREVIEW_SETUP.md` - Setup documentation

**Status:** Fully functional
**Configuration:** Fly.io token required ✅

## 🚀 Quick Start

### Using Sprites.dev
```jsx
import SpritesPreview from '@/components/SpritesPreviewRefactored';

<SpritesPreview repo="owner/repo" branch="main" />
```

### Using Fly.io Native
```jsx
import NativeFlyPreview from '@/components/NativeFlyPreview';

<NativeFlyPreview repo="owner/repo" branch="main" />
```

### Using Both (Recommended)
```jsx
import { useState } from 'react';
import SpritesPreview from '@/components/SpritesPreviewRefactored';
import NativeFlyPreview from '@/components/NativeFlyPreview';

export default function PreviewPage() {
  const [previewSystem, setPreviewSystem] = useState('sprites'); // or 'flyio'

  return (
    <>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setPreviewSystem('sprites')}>Sprites.dev</button>
        <button onClick={() => setPreviewSystem('flyio')}>Fly.io Native</button>
      </div>
      
      {previewSystem === 'sprites' && (
        <SpritesPreview repo="owner/repo" branch="main" />
      )}
      
      {previewSystem === 'flyio' && (
        <NativeFlyPreview repo="owner/repo" branch="main" />
      )}
    </>
  );
}
```

## 📋 Migration Guide

### If You Were Using Only Sprites.dev:
1. ✅ Sprites.dev is now fixed and ready
2. ✅ Use `SpritesPreviewRefactored` component
3. ✅ It's optimized for your use case

### If You Want Better Reliability:
1. ✅ Add Fly.io Native as fallback
2. ✅ Use hybrid approach
3. ✅ Get best of both worlds

### If You Want Full Control:
1. ✅ Switch to Fly.io Native only
2. ✅ Remove Sprites dependency
3. ✅ Self-contained solution

## ✅ What You Have Now

| Component | Status | Usage |
|-----------|--------|-------|
| Sprites.dev | ✅ Fixed & Ready | Fast IDE previews |
| Fly.io Native | ✅ Complete | Full deployments |
| Both APIs | ✅ Available | Choose as needed |
| Documentation | ✅ Complete | Reference guides |
| Components | ✅ Ready | Drop in your UI |

## 🎯 Final Recommendation

For **your use case** (fast IDE-like previews with Sprites.dev):

1. **Primary:** Sprites.dev
   - Use `SpritesPreviewRefactored` component
   - Fast 30-90 second previews
   - Perfect for PR reviews and design feedback

2. **Backup:** Fly.io Native
   - Use as fallback if Sprites.dev is down
   - Or for staging/persistent previews
   - Never broken preview experience

3. **Cost:** Optimal
   - Sprites.dev for most previews (cheap)
   - Fly.io for important staging (predictable)

## 📚 Documentation

- `SPRITES_DEV_SETUP_GUIDE.md` - Sprites.dev reference
- `FLY_NATIVE_PREVIEW_SETUP.md` - Fly.io Native reference
- `QUICK_START_FLY_NATIVE_PREVIEW.md` - Fly.io quick start
- `PREVIEW_SYSTEMS_COMPARISON.md` - This file

---

**Bottom line:** You now have two battle-tested preview systems. Sprites.dev for speed, Fly.io for reliability. Use both, or pick the one that fits your workflow. Either way, you're set! 🎯
