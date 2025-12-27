# Global Configuration Caching System

## Overview

The application now has a **global configuration caching system** that automatically synchronizes all settings across components, modals, and browser tabs. When you select a GitHub repository, configure Supabase, or set any other integration anywhere in the app, it's immediately available everywhere without any manual propagation.

## How It Works

### Architecture

1. **Global Config Storage** (`lib/global-config.js`)
   - Stores all settings in localStorage under the key `app_global_config`
   - Provides getter/setter functions with nested property support
   - Broadcasts changes via custom events for in-app synchronization
   - Listens to storage events for cross-tab synchronization

2. **Integration Provider** (`lib/integrations-context.jsx`)
   - Acts as a React context for managing GitHub, Supabase, and Netlify integrations
   - Now syncs all state changes to the global config automatically
   - Listens to global config changes and updates local state
   - Maintains backward compatibility with old localStorage keys

3. **React Hooks** (`lib/useGlobalConfig.js`)
   - `useGlobalConfig()` - Access and update entire config
   - `useGlobalConfigValue(path)` - Access and update specific config values
   - Automatically handle real-time updates from any source

## Auto-Sync Flow

When a GitHub repository is selected anywhere in the app:

```
User selects repo in UI
    ↓
Component calls github.setRepository(repo)
    ↓
IntegrationProvider updates local state
    ↓
useEffect syncs to global config
    ↓
Global config broadcasts CustomEvent
    ↓
All components listening to useIntegrations() get updated state
    ↓
Storage event triggers for cross-tab sync
    ↓
Other tabs/windows receive the update
```

## Configuration Structure

The global config structure is:

```javascript
{
  github: {
    token: "ghp_xxx...",
    repository: {
      owner: "username",
      name: "repo-name",
      id: "12345",
      defaultBranch: "main"
    }
  },
  supabase: {
    url: "https://xxx.supabase.co",
    key: "eyJhbGc...",
    schema: { /* schema object */ }
  }
}
```

## Usage Examples

### Example 1: Using useIntegrations() (Current Approach)

All existing components already work automatically:

```jsx
import { useIntegrations } from "@/lib/integrations-context";

export function MyComponent() {
  const { github, supabase } = useIntegrations();

  // Changes here automatically sync globally
  const handleSelectRepo = (repo) => {
    github.setRepository(repo);  // Auto-syncs to global config
  };

  // Automatically updated when changed elsewhere
  console.log(github.repository);  // Always up-to-date

  return (
    <div>
      Selected: {github.repository?.name}
    </div>
  );
}
```

### Example 2: Using useGlobalConfig() Hook (Direct Access)

For accessing config directly without the context:

```jsx
import { useGlobalConfig } from "@/lib/useGlobalConfig";

export function MyComponent() {
  const { config, updateConfig, getConfigValue } = useGlobalConfig();

  // Update a specific nested value
  const handleSaveConfig = () => {
    updateConfig("github.repository", {
      owner: "user",
      name: "repo"
    });
  };

  // Get a specific value
  const repo = getConfigValue("github.repository");

  return (
    <div>
      Repo: {repo?.name}
    </div>
  );
}
```

### Example 3: Using useGlobalConfigValue() Hook (Specific Value)

For watching a single config value:

```jsx
import { useGlobalConfigValue } from "@/lib/useGlobalConfig";

export function RepositorySelector() {
  const [selectedRepo, setSelectedRepo] = useGlobalConfigValue("github.repository");

  return (
    <div>
      Current: {selectedRepo?.name}
      <button onClick={() => setSelectedRepo(newRepo)}>
        Change Repository
      </button>
    </div>
  );
}
```

### Example 4: Using global-config Functions Directly

For server-side or non-React code:

```javascript
import {
  getGlobalConfig,
  setGlobalConfigNested,
  subscribeToConfigChanges
} from "@/lib/global-config";

// Get current config
const config = getGlobalConfig();
console.log(config.github.repository);

// Update a nested value
setGlobalConfigNested("github.repository", {
  owner: "user",
  name: "repo"
});

// Subscribe to changes from other sources
const unsubscribe = subscribeToConfigChanges((newConfig) => {
  console.log("Config updated:", newConfig);
});

// Cleanup when done
unsubscribe();
```

## Real-World Scenarios

### Scenario 1: User Selects Repo in Setup Flow

1. User selects a repository in the Setup page
2. `SetupFlow` component calls `github.setRepository(repo)`
3. `IntegrationProvider` updates state and syncs to global config
4. User navigates to CodeBuilder
5. CodeBuilder's `useIntegrations()` automatically has the repository selected
6. User can immediately start working with the repo

### Scenario 2: User Selects Repo in Integration Modal

1. User opens the Integration Settings modal in CodeBuilder
2. Selects a different repository
3. Modal calls `github.setRepository(newRepo)`
4. Global config broadcasts update
5. Main CodeBuilder component sees the change and updates file explorer
6. If user opens another tab, it also has the updated repository

### Scenario 3: Cross-Tab Synchronization

1. User has two tabs of the app open
2. In Tab A, they select a GitHub repository
3. Repository is stored in global config and localStorage
4. Tab B's `initializeStorageSync()` detects the storage change
5. Tab B broadcasts the change via custom event
6. All components in Tab B update to show the new repository

## Backward Compatibility

The system maintains backward compatibility with existing localStorage keys:
- `githubToken` → `config.github.token`
- `selectedRepository` → `config.github.repository`
- `supabaseSchema` → `config.supabase.schema`

These old keys are still updated for compatibility, but all new code should use the global config system.

## Benefits

✅ **No Manual Sync** - Changes propagate automatically  
✅ **Cross-Tab Sync** - Works across multiple browser tabs  
✅ **Real-Time Updates** - Uses custom events for instant updates  
✅ **Persistent** - All settings saved to localStorage  
✅ **Developer-Friendly** - Simple hooks and functions to use  
✅ **Non-Intrusive** - Adds functionality without replacing existing code  

## API Reference

### `lib/global-config.js`

```javascript
// Get current entire config
getGlobalConfig() → object

// Set entire config
setGlobalConfig(config) → void

// Set a single top-level property
setGlobalConfigProperty(key, value) → object

// Set a nested property (e.g., "github.repository")
setGlobalConfigNested(path, value) → object

// Get a nested property value
getGlobalConfigNested(path, defaultValue) → any

// Subscribe to config changes in this tab
subscribeToConfigChanges(callback) → unsubscribe function

// Initialize sync from other tabs (runs automatically in useGlobalConfig)
initializeStorageSync() → unsubscribe function

// Clear all config
clearGlobalConfig() → void
```

### `lib/useGlobalConfig.js`

```javascript
// Full config access with real-time sync
useGlobalConfig() → {
  config,           // Current config object
  isHydrated,       // Whether initial load is complete
  updateConfig,     // (path, value) => void
  updateConfigProperty, // (key, value) => void
  getConfigValue    // (path, defaultValue) => any
}

// Single value with setter
useGlobalConfigValue(path, defaultValue) → [value, setValue]
```

## Testing

To verify the global config system is working:

1. Open the Setup page and select a GitHub repository
2. Navigate to the Builder page - the repository should be pre-selected
3. Open the Integration modal in Builder and change the repository
4. The file explorer should update immediately
5. Open the app in another tab - it should have the same repository selected
6. Check browser localStorage (DevTools → Application → Local Storage) for `app_global_config`
