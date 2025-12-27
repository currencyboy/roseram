# Sprites Dynamic Configuration - Quick Start

Follow these steps to set up the dynamic Sprites.dev configuration system.

## Prerequisites

- Supabase project configured and running
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_PROJECT_URL`
  - `SUPABASE_SERVICE_ROLE`
  - `SPRITES_TOKEN`

## Step 1: Apply Database Schema

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy the entire contents from `scripts/setup-sprites-config-schema.sql`
5. Paste into the SQL editor
6. Click **Run**

Expected output: Schema created successfully with no errors

✅ You should see tables created for:
- `sprites_config`
- `data_endpoints`
- `sprite_config_mappings`
- `preview_config`
- `endpoint_health_checks`

## Step 2: Initialize Default Configuration

Run the initialization script from your project root:

```bash
node scripts/init-sprites-config.js
```

Expected output:
```
🚀 Initializing Sprites.dev configuration...

1️⃣ Setting up default Sprites configuration...
   ✅ Default configuration created

2️⃣ Setting up data endpoints...
   ✅ Sprites List
   ✅ Sprites Create
   ✅ Sprites Status
   ✅ Sprites Delete
   ✅ Sprites Port Detection
   ✅ GitHub Repositories
   ✅ GitHub Branches
   ✅ Supabase Projects
   ✅ Netlify Sites

3️⃣ Setting up configuration mappings...
   ✅ Mapped: provisioning -> sprites.create
   ✅ Mapped: status -> sprites.status
   ...

4️⃣ Verifying configuration...
   ✅ Active configurations: 1
   ✅ Active endpoints: 9

✨ Sprites.dev configuration initialized successfully!
```

## Step 3: Verify Configuration in Supabase

1. In Supabase SQL Editor, run:

```sql
-- Check default configuration
SELECT id, name, enabled FROM sprites_config WHERE name = 'default';

-- Check available endpoints
SELECT name, endpoint_key, service_name FROM data_endpoints ORDER BY created_at;

-- Check mappings
SELECT sm.purpose, de.name 
FROM sprite_config_mappings sm
JOIN data_endpoints de ON sm.data_endpoint_id = de.id
ORDER BY sm.order_index;
```

You should see:
- 1 default configuration
- 9 endpoints (Sprites, GitHub, Supabase, Netlify)
- 6+ mappings for various purposes

## Step 4: Test API Endpoints

Test configuration fetching:

```bash
# Test 1: Fetch sprite configuration
curl http://localhost:3000/api/sprites/config

# Test 2: Fetch available endpoints
curl http://localhost:3000/api/sprites/endpoints

# Test 3: Fetch endpoints by category
curl "http://localhost:3000/api/sprites/endpoints?category=preview"
```

You should get JSON responses with configuration and endpoint data.

## Step 5: Update Preview API Route (Optional but Recommended)

Update `app/api/sprites-preview/route.js` to use dynamic configuration:

```javascript
import spritesConfigManager from '@/lib/sprites-config-manager';

// In the GET handler, add before creating sprite:
try {
  const config = await spritesConfigManager.getConfig();
  if (config.success && config.config) {
    logger.info('[SpritesPreview] Using dynamic configuration', {
      configName: config.config.name,
      ramMb: config.config.defaultResources.ramMb,
    });
  }
} catch (error) {
  logger.warn('[SpritesPreview] Failed to load dynamic config', { error: error.message });
  // Continue with defaults if config fails
}

// When calling setupAndRunDevServer, pass config:
const configOverrides = await spritesConfigManager.applyConfigToSpritesService(spritesService);
await spritesService.setupAndRunDevServer(
  sprite,
  repositoryUrl,
  workingBranch,
  {
    workDir: '/workspace',
    scriptName: 'dev',
    timeout: 300000,
    // Add configuration overrides:
    portDetectionPatterns: configOverrides.devServer?.portDetectionPatterns,
    portDetectionTimeout: configOverrides.devServer?.portDetectionTimeout,
  }
);
```

## Step 6: Test Preview Creation

1. Navigate to preview section of your app
2. Click "Launch Preview"
3. Select a repository and branch
4. Monitor the logs to see:
   - Configuration being loaded
   - Endpoints being resolved
   - Port detection using configured patterns

## Troubleshooting

### Schema not applying

**Error**: "permission denied" or "relation already exists"

**Solution**:
1. Make sure you're using the service role token
2. Check Supabase project is active
3. Try dropping table first if it exists
4. Run schema script again

### Initialization script fails

**Error**: "SUPABASE_SERVICE_ROLE not set"

**Solution**:
1. Check `.env.local` has `SUPABASE_SERVICE_ROLE`
2. Run from project root directory
3. Ensure Node.js is version 14+

### API endpoints not responding

**Error**: 404 or timeout on `/api/sprites/config`

**Solution**:
1. Check dev server is running: `npm run dev`
2. Check configuration exists in Supabase:
   ```sql
   SELECT * FROM sprites_config WHERE enabled = true;
   ```
3. Check no RLS policy issues:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'sprites_config';
   ```

### Port detection not working

**Error**: "Dev server did not open a port"

**Solution**:
1. Check port detection patterns in config:
   ```sql
   SELECT port_detection_patterns FROM sprites_config WHERE name = 'default';
   ```
2. Check dev server output matches patterns
3. Add custom pattern if needed:
   ```sql
   UPDATE sprites_config 
   SET port_detection_patterns = port_detection_patterns || '["your-new-pattern"]'
   WHERE name = 'default';
   ```

## What's Next?

### For Testing
- Test preview creation with the new system
- Monitor logs to verify configuration is being used
- Check database for health check records

### For Production
- Review `SPRITES_DYNAMIC_CONFIG_GUIDE.md` for all features
- Set up health monitoring for endpoints
- Create custom configurations for different environments
- Implement dashboard for configuration management

### For Advanced Usage
- Add custom endpoints in Supabase UI or via API
- Create environment-specific configurations
- Implement webhook-based triggers
- Add monitoring and alerting

## Documentation

For detailed information:
- **Full Guide**: `SPRITES_DYNAMIC_CONFIG_GUIDE.md`
- **Implementation Details**: `SPRITES_CONFIG_IMPLEMENTATION.md`
- **API Reference**: See `/api/sprites/config` and `/api/sprites/endpoints`

## Quick Commands

```bash
# Verify schema is applied
psql $DATABASE_URL -c "\dt | grep sprites"

# Check configuration
curl http://localhost:3000/api/sprites/config | jq .

# List endpoints
curl http://localhost:3000/api/sprites/endpoints | jq .endpoints

# Clear app cache and restart
rm -rf .next && npm run dev
```

## Success Indicators ✅

You'll know it's working when:
- ✅ Schema applies without errors
- ✅ Init script completes successfully
- ✅ API endpoints return JSON data
- ✅ Configuration shows in Supabase UI
- ✅ Preview creation uses dynamic settings
- ✅ Port detection works with custom patterns
- ✅ Health checks record endpoint data

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review error logs in terminal and Supabase
3. Verify all environment variables are set
4. Check database schema exists with correct structure

---

**Duration**: ~10-15 minutes for complete setup
**Status**: Ready to implement
**Last Updated**: 2024
