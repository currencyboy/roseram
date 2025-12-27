import { logger } from '@/lib/errors';

class SpritesConfigManager {
  constructor() {
    this.configCache = null;
    this.endpointsCache = null;
    this.cacheTimestamp = null;
    this.cacheTTL = 60000; // 1 minute cache
  }

  /**
   * Fetch sprite configuration with caching
   */
  async getConfig(name = 'default', forceRefresh = false) {
    try {
      const now = Date.now();
      
      // Return cached config if still valid and not force refreshing
      if (!forceRefresh && this.configCache && this.cacheTimestamp) {
        if (now - this.cacheTimestamp < this.cacheTTL) {
          logger.debug('[SpritesConfigManager] Using cached configuration');
          return this.configCache;
        }
      }

      const response = await fetch(`/api/sprites/config?name=${name}&includeEndpoints=true&includeHealth=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch sprite configuration');
      }

      const data = await response.json();
      
      // Cache the configuration
      this.configCache = data;
      this.cacheTimestamp = now;

      logger.info('[SpritesConfigManager] Configuration fetched and cached', { name });
      return data;
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to fetch configuration', { 
        error: error.message,
        name 
      });
      throw error;
    }
  }

  /**
   * Get all available data endpoints
   */
  async getEndpoints(category = null, serviceName = null, forceRefresh = false) {
    try {
      const cacheKey = `${category || 'all'}-${serviceName || 'all'}`;
      const now = Date.now();
      
      if (!forceRefresh && this.endpointsCache && this.cacheTimestamp) {
        if (now - this.cacheTimestamp < this.cacheTTL) {
          return this.endpointsCache;
        }
      }

      let url = '/api/sprites/endpoints?enabledOnly=true&includeHealth=true';
      if (category) url += `&category=${category}`;
      if (serviceName) url += `&service=${serviceName}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch endpoints');
      }

      const data = await response.json();
      this.endpointsCache = data;
      this.cacheTimestamp = now;

      logger.info('[SpritesConfigManager] Endpoints fetched', { 
        count: data.count,
        category,
        serviceName 
      });

      return data;
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to fetch endpoints', { error: error.message });
      throw error;
    }
  }

  /**
   * Get endpoint by key
   */
  async getEndpointByKey(key) {
    try {
      const data = await this.getEndpoints();
      const endpoint = data.endpoints.find(e => e.key === key);
      
      if (!endpoint) {
        throw new Error(`Endpoint not found: ${key}`);
      }

      return endpoint;
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to get endpoint by key', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get endpoints by category
   */
  async getEndpointsByCategory(category) {
    try {
      return await this.getEndpoints(category);
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to get endpoints by category', { 
        category, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get endpoints by service name
   */
  async getEndpointsByService(serviceName) {
    try {
      return await this.getEndpoints(null, serviceName);
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to get endpoints by service', { 
        serviceName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Apply configuration to sprites service
   */
  async applyConfigToSpritesService(spritesService) {
    try {
      const config = await this.getConfig();
      
      if (!config.success || !config.config) {
        throw new Error('Failed to load sprite configuration');
      }

      const cfg = config.config;
      
      // Apply resource configuration
      logger.info('[SpritesConfigManager] Applying configuration to sprites service', {
        ramMb: cfg.defaultResources.ramMb,
        cpus: cfg.defaultResources.cpus,
        region: cfg.defaultResources.region,
      });

      // Return configuration object that can be used to override defaults
      return {
        resources: cfg.defaultResources,
        devServer: cfg.devServer,
        previewUrlTemplate: cfg.previewUrlTemplate,
        endpoints: config.endpoints,
      };
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to apply configuration', { error: error.message });
      throw error;
    }
  }

  /**
   * Build complete endpoint URL with parameters
   */
  buildEndpointUrl(endpoint, params = {}) {
    try {
      let url = endpoint.url;

      // Replace path parameters
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, value);
      });

      // Add query parameters
      if (Object.keys(endpoint.queryParams || {}).length > 0 || Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams({
          ...endpoint.queryParams,
          ...params,
        });
        url += `?${queryParams.toString()}`;
      }

      return url;
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to build endpoint URL', { error: error.message });
      throw error;
    }
  }

  /**
   * Build complete headers for endpoint request
   */
  buildEndpointHeaders(endpoint, token = null) {
    try {
      const headers = {
        ...endpoint.headers,
        'Content-Type': 'application/json',
      };

      // Add authentication header if needed
      if (endpoint.authType === 'bearer' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (endpoint.authType === 'api_key' && token) {
        headers[endpoint.authHeaderName || 'X-API-Key'] = token;
      }

      return headers;
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to build headers', { error: error.message });
      throw error;
    }
  }

  /**
   * Make request to configured endpoint
   */
  async callEndpoint(endpoint, options = {}) {
    try {
      const {
        params = {},
        token = null,
        body = null,
        timeout = 30000,
      } = options;

      const url = this.buildEndpointUrl(endpoint, params);
      const headers = this.buildEndpointHeaders(endpoint, token);

      const requestOptions = {
        method: endpoint.method,
        headers,
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        requestOptions.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Endpoint returned ${response.status}`);
        }

        const data = await response.json();
        
        logger.info('[SpritesConfigManager] Endpoint call successful', {
          key: endpoint.key,
          method: endpoint.method,
          status: response.status,
        });

        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error(`Endpoint request timed out after ${timeout}ms`);
        }
        throw error;
      }
    } catch (error) {
      logger.error('[SpritesConfigManager] Failed to call endpoint', {
        endpointKey: endpoint.key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.configCache = null;
    this.endpointsCache = null;
    this.cacheTimestamp = null;
    logger.info('[SpritesConfigManager] Cache cleared');
  }

  /**
   * Set cache TTL (time to live in milliseconds)
   */
  setCacheTTL(ttl) {
    this.cacheTTL = ttl;
    logger.info('[SpritesConfigManager] Cache TTL set to', { ttl });
  }
}

// Export singleton instance
export const spritesConfigManager = new SpritesConfigManager();
export default spritesConfigManager;
