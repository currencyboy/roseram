# Sprites.dev Dynamic Configuration Guide

## Overview

This guide explains the new dynamic configuration system for Sprites.dev integration. This system allows you to fetch sprite configurations and data endpoints directly from your Supabase database, enabling seamless integration with sprite.dev for preview functionality.

## Features

- **Dynamic Configuration Management**: Store and manage Sprites configuration in the database
- **Data Endpoint Mapping**: Define and map all required data endpoints
- **Health Monitoring**: Track endpoint health and performance
- **Caching**: Built-in caching for improved performance
- **Admin Controls**: Secure admin-only configuration management
- **Configuration Overrides**: Support for environment-specific overrides

## Architecture

### Database Tables

#### 1. `sprites_config`
Stores the main Sprites configuration
- API endpoint configuration
- Default resource allocation (RAM, CPUs, region)
- Dev server settings
- Port detection configuration
- Preview URL templates

#### 2. `data_endpoints`
Stores all available data endpoints
- Endpoint URLs and methods
- Authentication configuration
- Request/response handling
- Caching settings
- Service categorization

#### 3. `sprite_config_mappings`
Maps endpoints to specific purposes
- Provisioning endpoints
- Status check endpoints
- Port detection endpoints
- Cleanup endpoints
- Custom purpose mappings

#### 4. `preview_config`
Stores per-project preview settings
- Preview enablement
- Auto-launch settings
- Resource overrides
- Environment variables
- GitHub repository mapping

#### 5. `endpoint_health_checks`
Monitors endpoint health
- Status tracking (healthy, degraded, unhealthy)
- Response time monitoring
- Error tracking
- Historical data

## Setup Instructions

### Step 1: Apply Database Schema

Run the SQL migration to create all necessary tables:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to "SQL Editor"
4. Create new query
5. Copy the contents of `scripts/setup-sprites-config-schema.sql`
6. Click "Run"

### Step 2: Initialize Default Configuration

Run the initialization script to populate default configurations:

```bash
node scripts/init-sprites-config.js
```

This will:
- Create default Sprites configuration
- Add common data endpoints (GitHub, Supabase, Netlify, Sprites API)
- Create configuration mappings for standard purposes

### Step 3: Verify Setup

Check the Supabase tables to confirm data:

```sql
-- Check if default configuration exists
SELECT * FROM sprites_config WHERE enabled = true;

-- Check available endpoints
SELECT name, endpoint_key, service_name FROM data_endpoints WHERE enabled = true;

-- Check mappings
SELECT * FROM sprite_config_mappings;
```

## Usage

### In Server Code (API Routes)

```javascript
import spritesConfigManager from '@/lib/sprites-config-manager';

// Fetch sprite configuration
const config = await spritesConfigManager.getConfig('default');

// Access configuration values
const { defaultResources, devServer, endpoints } = config.config;

// Get endpoints for a specific purpose
const provisioningEndpoints = config.endpoints.provisioning;
```

### In Components

```javascript
import { spritesConfigManager } from '@/lib/sprites-config-manager';

async function initializePreview() {
  try {
    // Get all configuration
    const config = await spritesConfigManager.getConfig();
    
    // Apply configuration
    const appliedConfig = await spritesConfigManager.applyConfigToSpritesService(spritesService);
    
    // Use configuration
    const resources = appliedConfig.resources;
    console.log(`Using ${resources.cpus} CPUs and ${resources.ramMb}MB RAM`);
  } catch (error) {
    console.error('Failed to load configuration:', error);
  }
}
```

### Calling Data Endpoints

```javascript
// Get endpoint
const endpoint = await spritesConfigManager.getEndpointByKey('sprites.create');

// Build and call endpoint
const result = await spritesConfigManager.callEndpoint(endpoint, {
  params: { sprite_id: 'my-sprite-123' },
  token: githubToken,
  timeout: 30000,
});
```

## API Endpoints

### GET /api/sprites/config

Fetch sprite configuration with all associated endpoints.

**Query Parameters:**
- `name` - Configuration name (default: 'default')
- `includeEndpoints` - Include endpoint mappings (default: true)
- `includeHealth` - Include health check data (default: true)

**Response:**
```json
{
  "success": true,
  "config": {
    "id": "uuid",
    "name": "default",
    "enabled": true,
    "apiBaseUrl": "https://api.sprites.dev",
    "defaultResources": {
      "ramMb": 1024,
      "cpus": 2,
      "region": "ord"
    },
    "devServer": {
      "packageManager": "npm",
      "scriptName": "dev",
      "portDetectionTimeout": 300000,
      "portDetectionPatterns": [...]
    },
    "previewUrlTemplate": "https://{sprite_name}.sprites.dev"
  },
  "endpoints": {
    "provisioning": [...],
    "status": [...],
    "port-detection": [...]
  }
}
```

### GET /api/sprites/endpoints

Fetch available data endpoints.

**Query Parameters:**
- `category` - Filter by category (general, preview, configuration, monitoring)
- `service` - Filter by service name (github, supabase, netlify, sprites)
- `enabledOnly` - Only enabled endpoints (default: true)
- `includeHealth` - Include health data (default: true)

**Response:**
```json
{
  "success": true,
  "endpoints": [...],
  "count": 5
}
```

### POST /api/sprites/config (Admin only)

Create or update sprite configuration.

**Request Body:**
```json
{
  "name": "default",
  "enabled": true,
  "apiBaseUrl": "https://api.sprites.dev",
  "defaultResources": {
    "ramMb": 1024,
    "cpus": 2,
    "region": "ord"
  },
  "devServer": {
    "packageManager": "npm",
    "scriptName": "dev",
    "portDetectionTimeout": 300000
  }
}
```

### POST /api/sprites/endpoints (Admin only)

Create a new data endpoint.

**Request Body:**
```json
{
  "name": "Custom Endpoint",
  "endpointKey": "custom.endpoint",
  "url": "https://api.example.com/endpoint",
  "method": "GET",
  "authType": "bearer",
  "category": "general",
  "serviceName": "example"
}
```

## Configuration Management

### Add New Endpoint

1. Create endpoint via POST /api/sprites/endpoints or directly in Supabase
2. Create mapping in sprite_config_mappings table
3. Endpoints automatically become available to preview

### Update Endpoint

1. Edit endpoint in data_endpoints table
2. Clear configuration cache: `spritesConfigManager.clearCache()`
3. Changes apply on next request

### Override Configuration

Create preview-specific configuration:

```sql
INSERT INTO preview_config (
  project_id,
  user_id,
  sprites_config_id,
  enabled,
  ram_mb,
  cpus,
  region,
  env_vars
) VALUES (
  'project-123',
  'user-uuid',
  (SELECT id FROM sprites_config WHERE name = 'default'),
  true,
  2048,  -- Override RAM
  4,     -- Override CPUs
  'sfo',
  '{"CUSTOM_VAR": "value"}'
);
```

## Troubleshooting

### Configuration Not Found

**Error:** `Sprite configuration not found`

**Solution:**
1. Ensure database schema is applied
2. Run `node scripts/init-sprites-config.js`
3. Verify `sprites_config` table has enabled = true

### Endpoints Not Loading

**Error:** `Failed to fetch endpoints`

**Solution:**
1. Check Supabase connection
2. Verify RLS policies allow your user to read endpoints
3. Ensure `data_endpoints` table is populated
4. Clear cache: `spritesConfigManager.clearCache()`

### Port Detection Not Working

**Error:** `Dev server did not open a port`

**Solution:**
1. Check `port_detection_patterns` in config
2. Add custom patterns if needed
3. Verify dev server actually opens a port
4. Check server output for port detection matches

### Health Checks Failing

**Solution:**
1. Run health check monitoring script periodically
2. Check endpoint URLs are correct
3. Verify authentication tokens are valid
4. Monitor response times for performance issues

## Best Practices

1. **Caching**: Use caching for frequently accessed configurations
2. **Versioning**: Version configuration changes in documentation
3. **Monitoring**: Set up periodic health checks for endpoints
4. **Security**: Use service role for admin operations, anon for user operations
5. **Logging**: Enable detailed logging for debugging
6. **Testing**: Test configuration changes in staging before production

## Environment Variables

Required environment variables for proper operation:

```
NEXT_PUBLIC_SUPABASE_PROJECT_URL=your-supabase-url
SUPABASE_SERVICE_ROLE=your-service-role-key
SPRITES_TOKEN=your-sprites-token
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review database logs in Supabase
3. Check application logs for detailed error messages
4. Enable debug logging: `spritesConfigManager.setDebug(true)`

## Next Steps

1. Apply the database schema
2. Run the initialization script
3. Update your SpritesPreview component to use `spritesConfigManager`
4. Test preview functionality
5. Monitor endpoint health and performance
