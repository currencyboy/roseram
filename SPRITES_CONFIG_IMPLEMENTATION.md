# Sprites Dynamic Configuration Implementation

## What Was Done

This implementation adds a comprehensive dynamic configuration system for Sprites.dev integration. Instead of hardcoding endpoints and configuration, all settings are stored in the database and fetched dynamically.

## Files Created/Modified

### New Files Created

1. **`scripts/setup-sprites-config-schema.sql`**
   - Database schema for sprite configuration management
   - Creates 5 main tables:
     - `sprites_config` - Main configuration
     - `data_endpoints` - All available data endpoints
     - `sprite_config_mappings` - Purpose-based endpoint mappings
     - `preview_config` - Per-project settings
     - `endpoint_health_checks` - Endpoint health monitoring
   - Includes RLS policies for security
   - Includes triggers for auto-updating timestamps

2. **`app/api/sprites/config/route.js`**
   - API endpoint to fetch sprite configurations
   - Retrieves config with all associated endpoints and health data
   - Admin-only POST endpoint for creating/updating configurations
   - Comprehensive logging and error handling

3. **`app/api/sprites/endpoints/route.js`**
   - API endpoint to list and manage data endpoints
   - Supports filtering by category and service
   - Includes health check information
   - Admin-only POST endpoint for creating new endpoints

4. **`lib/sprites-config-manager.js`**
   - Singleton manager class for sprite configurations
   - Features:
     - Configuration and endpoint caching
     - Dynamic endpoint URL building
     - Header generation with authentication
     - Endpoint health tracking
     - Built-in timeout and error handling
   - Methods:
     - `getConfig()` - Fetch sprite configuration
     - `getEndpoints()` - Get all endpoints
     - `getEndpointByKey()` - Find specific endpoint
     - `applyConfigToSpritesService()` - Apply config overrides
     - `callEndpoint()` - Execute endpoint requests
     - `buildEndpointUrl()` - Build URLs with parameters
     - `buildEndpointHeaders()` - Create request headers

5. **`scripts/init-sprites-config.js`**
   - Initialization script to set up default configuration
   - Creates default Sprites configuration
   - Adds common data endpoints:
     - Sprites API endpoints (list, create, status, delete, port-detect)
     - GitHub endpoints (repositories, branches)
     - Supabase endpoints (projects)
     - Netlify endpoints (sites)
   - Creates configuration mappings for standard purposes
   - Includes verification and reporting

6. **`SPRITES_DYNAMIC_CONFIG_GUIDE.md`**
   - Comprehensive user guide
   - Setup instructions
   - Usage examples
   - API documentation
   - Troubleshooting guide
   - Best practices

### Files Modified

1. **`lib/sprites-service.js`**
   - Updated `setupAndRunDevServer()` to accept:
     - `portDetectionPatterns` - Custom regex patterns
     - `portDetectionTimeout` - Configurable timeout
   - Updated `_runSetupSequenceWithPortDetection()` to:
     - Accept custom port detection patterns
     - Fall back to defaults if custom patterns fail
     - Log pattern usage
   - Maintains backward compatibility

## How It Works

### Configuration Flow

```
User Request
    ↓
SpritesPreview Component
    ↓
spritesConfigManager.getConfig()
    ↓
/api/sprites/config (cached)
    ↓
Fetch from sprites_config + related tables
    ↓
Return config with endpoints
    ↓
Apply to sprites-service
    ↓
Create preview with dynamic settings
```

### Data Endpoint Mapping

```
Purpose (provisioning, status, port-detection, cleanup)
    ↓
sprite_config_mappings
    ↓
data_endpoints
    ↓
Endpoint URL, method, auth, parameters
    ↓
Used by spritesConfigManager
    ↓
Called with authorization tokens
```

## Key Benefits

1. **Centralized Configuration**: All settings in database, not hardcoded
2. **Dynamic Updates**: Change configuration without redeploying
3. **Multiple Purposes**: Support different endpoints for different purposes
4. **Health Monitoring**: Track endpoint availability and performance
5. **Caching**: Improved performance with intelligent caching
6. **Extensibility**: Easy to add new endpoints and purposes
7. **Security**: Admin-only management, user-level access controls
8. **Environment Specific**: Different configs for dev/staging/prod

## Implementation Steps

### Phase 1: Database Setup (Required)

```bash
# 1. Apply schema migration
# Go to Supabase SQL Editor and run:
# scripts/setup-sprites-config-schema.sql

# 2. Initialize default configuration
node scripts/init-sprites-config.js
```

### Phase 2: Update Application Code (Required)

1. Import `spritesConfigManager` in API routes:
```javascript
import spritesConfigManager from '@/lib/sprites-config-manager';
```

2. Use configuration in sprites-preview API route:
```javascript
const config = await spritesConfigManager.getConfig();
const configOverrides = await spritesConfigManager.applyConfigToSpritesService(spritesService);
```

3. Pass configuration to setup:
```javascript
await spritesService.setupAndRunDevServer(
  sprite,
  repoUrl,
  branch,
  {
    ...options,
    portDetectionPatterns: configOverrides.devServer.portDetectionPatterns,
    portDetectionTimeout: configOverrides.devServer.portDetectionTimeout,
  }
);
```

### Phase 3: Testing (Recommended)

1. Test default configuration:
```bash
curl http://localhost:3000/api/sprites/config
```

2. Test endpoints:
```bash
curl http://localhost:3000/api/sprites/endpoints
```

3. Test preview creation with new system

## Database Tables Structure

### sprites_config
```sql
- id (UUID, PK)
- name (TEXT, UNIQUE) - e.g., 'default'
- enabled (BOOLEAN)
- api_token_ref (TEXT) - env var reference
- api_base_url (TEXT)
- default_ram_mb (INTEGER)
- default_cpus (INTEGER)
- default_region (TEXT)
- default_package_manager (TEXT)
- default_script_name (TEXT)
- port_detection_timeout_ms (INTEGER)
- port_detection_patterns (JSONB) - array of regex patterns
- preview_url_template (TEXT)
- created_at, updated_at (TIMESTAMPS)
```

### data_endpoints
```sql
- id (UUID, PK)
- name (TEXT)
- endpoint_key (TEXT, UNIQUE) - e.g., 'sprites.create'
- url (TEXT)
- method (TEXT) - GET, POST, PUT, DELETE, PATCH
- enabled (BOOLEAN)
- auth_type (TEXT) - none, bearer, api_key, custom
- headers (JSONB)
- query_params (JSONB)
- response_format (TEXT) - json, text, binary
- category (TEXT) - general, preview, configuration, monitoring
- service_name (TEXT) - github, supabase, netlify, sprites
- cache_enabled (BOOLEAN)
- cache_ttl_seconds (INTEGER)
- created_at, updated_at (TIMESTAMPS)
```

### sprite_config_mappings
```sql
- id (UUID, PK)
- sprites_config_id (UUID, FK)
- data_endpoint_id (UUID, FK)
- purpose (TEXT) - provisioning, status, port-detection, cleanup
- is_required (BOOLEAN)
- is_primary (BOOLEAN)
- override_url (TEXT) - optional override
- override_method (TEXT) - optional override
- override_headers (JSONB)
- override_query_params (JSONB)
- order_index (INTEGER)
- created_at, updated_at (TIMESTAMPS)
```

## Environment Variables

No new environment variables required. System uses existing:
- `NEXT_PUBLIC_SUPABASE_PROJECT_URL`
- `SUPABASE_SERVICE_ROLE`
- `SPRITES_TOKEN`

## Security Considerations

1. **RLS Policies**: Admin-only access to configuration tables
2. **Service Role**: Used for internal configuration operations
3. **Token Management**: Tokens stored as references, not directly in endpoints
4. **User Isolation**: Each user can only see/modify their own preview configs
5. **Audit Trail**: All changes tracked via created_at/updated_at timestamps

## Backward Compatibility

- Existing `lib/sprites-service.js` still works with new parameters
- All new parameters are optional with sensible defaults
- Existing code doesn't need changes unless using configuration

## Testing Checklist

- [ ] Database schema applied without errors
- [ ] Initialization script runs successfully
- [ ] Configuration fetched via API endpoint
- [ ] Endpoints listed via API endpoint
- [ ] Preview creation works with new system
- [ ] Port detection works with custom patterns
- [ ] Health checks track endpoint status
- [ ] Caching improves performance
- [ ] Admin operations secured properly
- [ ] User preview config isolation works

## Troubleshooting Common Issues

### "Sprite configuration not found"
- Run initialization script
- Verify table exists in Supabase

### "Failed to fetch endpoints"
- Check Supabase connection
- Verify RLS policies
- Check data_endpoints table populated

### "Port detection not working"
- Check port_detection_patterns in config
- Verify patterns match dev server output
- Add custom patterns if needed

### Configuration changes not applying
- Clear cache: `spritesConfigManager.clearCache()`
- Check that enabled = true in database
- Restart application

## Performance Considerations

1. **Caching**: Configurations cached for 1 minute by default
2. **Indexes**: Composite indexes on frequently queried columns
3. **Query Optimization**: Efficient joins between tables
4. **Health Checks**: Periodic async health monitoring (not blocking)

## Next Steps

1. **Immediate**: Apply database schema and run init script
2. **Short-term**: Update preview creation code to use new system
3. **Medium-term**: Add UI for managing configurations
4. **Long-term**: Implement health monitoring dashboard

## Support Resources

- See `SPRITES_DYNAMIC_CONFIG_GUIDE.md` for detailed usage
- Check Supabase documentation for SQL debugging
- Review application logs for error details
- Monitor endpoint health via health checks table

---

**Status**: ✅ Implementation Complete
**Last Updated**: 2024
**Version**: 1.0
