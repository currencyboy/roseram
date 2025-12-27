// Global Configuration Manager
// Provides real-time synchronization of settings across all components and browser tabs

const CONFIG_STORAGE_KEY = 'app_global_config';
const CONFIG_CHANGE_EVENT = 'appConfigChanged';

// Event listeners for config changes
const listeners = new Set();

// Initialize global config from localStorage
function getStoredConfig() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to parse global config:', error);
    return {};
  }
}

// Save config to localStorage
function saveConfigToStorage(config) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save global config:', error);
  }
}

// Broadcast config change to all listeners
function broadcastConfigChange(config) {
  if (typeof window === 'undefined') return;
  
  // Notify all listeners in this tab/window
  const event = new CustomEvent(CONFIG_CHANGE_EVENT, {
    detail: { config }
  });
  window.dispatchEvent(event);
}

// Get current global config
export function getGlobalConfig() {
  return getStoredConfig();
}

// Set specific config property and broadcast changes
export function setGlobalConfigProperty(key, value) {
  const current = getStoredConfig();
  const updated = {
    ...current,
    [key]: value
  };
  saveConfigToStorage(updated);
  broadcastConfigChange(updated);
  return updated;
}

// Set entire config object
export function setGlobalConfig(config) {
  saveConfigToStorage(config);
  broadcastConfigChange(config);
}

// Update nested property (e.g., 'github.repository')
export function setGlobalConfigNested(path, value) {
  const current = getStoredConfig();
  const keys = path.split('.');
  let obj = current;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in obj)) {
      obj[key] = {};
    }
    obj = obj[key];
  }
  
  const lastKey = keys[keys.length - 1];
  obj[lastKey] = value;
  
  saveConfigToStorage(current);
  broadcastConfigChange(current);
  return current;
}

// Get nested config value
export function getGlobalConfigNested(path, defaultValue = null) {
  const current = getStoredConfig();
  const keys = path.split('.');
  let value = current;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

// Subscribe to config changes
export function subscribeToConfigChanges(callback) {
  if (typeof window === 'undefined') return () => {};
  
  const handleConfigChange = (event) => {
    callback(event.detail.config);
  };
  
  window.addEventListener(CONFIG_CHANGE_EVENT, handleConfigChange);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener(CONFIG_CHANGE_EVENT, handleConfigChange);
  };
}

// Listen to storage changes from other tabs/windows
export function initializeStorageSync() {
  if (typeof window === 'undefined') return () => {};
  
  const handleStorageChange = (event) => {
    if (event.key === CONFIG_STORAGE_KEY && event.newValue) {
      try {
        const newConfig = JSON.parse(event.newValue);
        broadcastConfigChange(newConfig);
      } catch (error) {
        console.error('Failed to sync config from storage:', error);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

// Clear all config
export function clearGlobalConfig() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  broadcastConfigChange({});
}
