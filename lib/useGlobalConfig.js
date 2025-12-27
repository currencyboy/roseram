import { useEffect, useState, useCallback } from 'react';
import {
  getGlobalConfig,
  getGlobalConfigNested,
  setGlobalConfigNested,
  setGlobalConfigProperty,
  subscribeToConfigChanges,
  initializeStorageSync,
} from './global-config';

/**
 * Hook to access and manage global configuration with real-time sync
 * Automatically syncs across all components and browser tabs
 */
export function useGlobalConfig() {
  const [config, setConfig] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize on mount
  useEffect(() => {
    // Initialize storage sync for cross-tab updates
    const unsubscribeStorageSync = initializeStorageSync();

    // Load initial config
    const initialConfig = getGlobalConfig();
    setConfig(initialConfig);

    // Subscribe to config changes
    const unsubscribeChanges = subscribeToConfigChanges((newConfig) => {
      setConfig(newConfig);
    });

    setIsHydrated(true);

    // Cleanup
    return () => {
      unsubscribeStorageSync();
      unsubscribeChanges();
    };
  }, []);

  // Helper function to update config
  const updateConfig = useCallback((path, value) => {
    setGlobalConfigNested(path, value);
  }, []);

  // Helper function to update config property
  const updateConfigProperty = useCallback((key, value) => {
    setGlobalConfigProperty(key, value);
  }, []);

  // Helper function to get nested value
  const getConfigValue = useCallback((path, defaultValue = null) => {
    return getGlobalConfigNested(path, defaultValue);
  }, []);

  return {
    config,
    isHydrated,
    updateConfig,
    updateConfigProperty,
    getConfigValue,
  };
}

/**
 * Simpler hook for just reading a specific config value with updates
 */
export function useGlobalConfigValue(path, defaultValue = null) {
  const [value, setValue] = useState(() => getGlobalConfigNested(path, defaultValue));

  useEffect(() => {
    // Load initial value
    setValue(getGlobalConfigNested(path, defaultValue));

    // Subscribe to changes
    const unsubscribeStorageSync = initializeStorageSync();
    const unsubscribeChanges = subscribeToConfigChanges((newConfig) => {
      const keys = path.split('.');
      let val = newConfig;
      for (const key of keys) {
        if (val && typeof val === 'object' && key in val) {
          val = val[key];
        } else {
          val = defaultValue;
          break;
        }
      }
      setValue(val);
    });

    return () => {
      unsubscribeStorageSync();
      unsubscribeChanges();
    };
  }, [path, defaultValue]);

  const updateValue = useCallback((newValue) => {
    setGlobalConfigNested(path, newValue);
  }, [path]);

  return [value, updateValue];
}
