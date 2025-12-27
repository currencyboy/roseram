"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  getGlobalConfig,
  setGlobalConfigNested,
  subscribeToConfigChanges,
  initializeStorageSync,
} from "./global-config";

const IntegrationCtx = createContext(null);

export function IntegrationProvider({ children }) {
  const [githubToken, setGithubToken] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseSchema, setSupabaseSchema] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Use refs to track what we've synced to prevent circular updates
  const lastSyncedRef = useRef({
    token: null,
    repo: null,
    schema: null,
    url: null,
    key: null,
  });

  // Load from database and global config on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize storage sync for cross-tab updates
    const unsubscribeStorageSync = initializeStorageSync();

    const loadIntegrations = async () => {
      try {
        // First try to load from database (more secure and reliable)
        console.log("[IntegrationProvider] Loading integrations from database...");
        const dbResponse = await fetch("/api/integrations/load-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          console.log("[IntegrationProvider] Loaded from database:", {
            hasGithub: !!dbData.github?.token,
            hasSupabase: !!dbData.supabase?.key,
            hasNetlify: !!dbData.netlify?.token,
          });

          if (dbData.github?.token) {
            console.log("[IntegrationProvider] Setting GitHub token from database");
            setGithubToken(dbData.github.token);
          }
          if (dbData.supabase?.key) {
            console.log("[IntegrationProvider] Setting Supabase credentials from database");
            setSupabaseUrl(dbData.supabase.url);
            setSupabaseKey(dbData.supabase.key);
          }
        } else {
          console.warn("[IntegrationProvider] Failed to load from database:", dbResponse.status);
        }
      } catch (dbError) {
        console.warn("[IntegrationProvider] Error loading from database:", dbError.message);
      }

      // Then load from global config/localStorage as fallback or override
      try {
        const globalConfig = getGlobalConfig();

        console.log("[IntegrationProvider] Loading from global config:", {
          hasGlobalConfig: Object.keys(globalConfig).length > 0,
        });

        // Load from global config or fallback to old localStorage keys for migration
        const savedRepo = globalConfig.github?.repository ||
                         (typeof window !== "undefined" ? localStorage.getItem("selectedRepository") : null);
        const savedSchema = globalConfig.supabase?.schema ||
                           (typeof window !== "undefined" ? localStorage.getItem("supabaseSchema") : null);
        const savedToken = globalConfig.github?.token ||
                          (typeof window !== "undefined" ? localStorage.getItem("githubToken") : null);

        // Use token from saved config/localStorage if available (overrides database)
        // This allows users to switch tokens without changing database
        if (savedToken) {
          console.log("[IntegrationProvider] Using GitHub token from localStorage (override)");
          setGithubToken(savedToken);
        }

        if (savedRepo && savedToken) {
          const parsedRepo = typeof savedRepo === "string" ? JSON.parse(savedRepo) : savedRepo;
          console.log("[IntegrationProvider] Setting repository:", parsedRepo);
          setSelectedRepo(parsedRepo);
        } else if (savedRepo && !savedToken) {
          console.log("[IntegrationProvider] Clearing repository - no valid token");
        }

        if (savedSchema) {
          const parsedSchema = typeof savedSchema === "string" ? JSON.parse(savedSchema) : savedSchema;
          setSupabaseSchema(parsedSchema);
        }

        if (globalConfig.supabase?.url) {
          setSupabaseUrl(globalConfig.supabase.url);
        }

        if (globalConfig.supabase?.key) {
          setSupabaseKey(globalConfig.supabase.key);
        }
      } catch (error) {
        console.error("Failed to load from global config:", error);
      }
    };

    loadIntegrations();

    // Subscribe to global config changes from other components/tabs
    const unsubscribeChanges = subscribeToConfigChanges((newConfig) => {
      console.log("[IntegrationProvider] Received config change from another source:", newConfig);

      // Update state only if the values actually changed from what we synced
      const repoChanged = JSON.stringify(newConfig.github?.repository) !== JSON.stringify(lastSyncedRef.current.repo);
      const tokenChanged = newConfig.github?.token !== lastSyncedRef.current.token;
      const schemaChanged = JSON.stringify(newConfig.supabase?.schema) !== JSON.stringify(lastSyncedRef.current.schema);
      const urlChanged = newConfig.supabase?.url !== lastSyncedRef.current.url;
      const keyChanged = newConfig.supabase?.key !== lastSyncedRef.current.key;

      if (repoChanged && newConfig.github?.repository) {
        setSelectedRepo(newConfig.github.repository);
      }
      if (tokenChanged && newConfig.github?.token) {
        setGithubToken(newConfig.github.token);
      }
      if (schemaChanged && newConfig.supabase?.schema) {
        setSupabaseSchema(newConfig.supabase.schema);
      }
      if (urlChanged && newConfig.supabase?.url) {
        setSupabaseUrl(newConfig.supabase.url);
      }
      if (keyChanged && newConfig.supabase?.key) {
        setSupabaseKey(newConfig.supabase.key);
      }

      // Update ref to track what we just synced
      lastSyncedRef.current = {
        token: newConfig.github?.token || null,
        repo: newConfig.github?.repository || null,
        schema: newConfig.supabase?.schema || null,
        url: newConfig.supabase?.url || null,
        key: newConfig.supabase?.key || null,
      };
    });

    setIsHydrated(true);

    return () => {
      unsubscribeStorageSync();
      unsubscribeChanges();
    };
  }, []);

  // Sync github token to global config when it changes
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    if (githubToken && githubToken !== lastSyncedRef.current.token) {
      console.log("[IntegrationProvider] Syncing github token to global config");
      setGlobalConfigNested("github.token", githubToken);
      lastSyncedRef.current.token = githubToken;
      // Also keep old localStorage key for backward compatibility
      localStorage.setItem("githubToken", githubToken);
    }
  }, [githubToken, isHydrated]);

  // Sync selected repo to global config when it changes
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    const repoString = JSON.stringify(selectedRepo);
    const lastRepoString = JSON.stringify(lastSyncedRef.current.repo);

    if (selectedRepo && repoString !== lastRepoString) {
      console.log("[IntegrationProvider] Syncing selected repository to global config:", selectedRepo);
      setGlobalConfigNested("github.repository", selectedRepo);
      lastSyncedRef.current.repo = selectedRepo;
      // Also keep old localStorage key for backward compatibility
      localStorage.setItem("selectedRepository", JSON.stringify(selectedRepo));
    }
  }, [selectedRepo, isHydrated]);

  // Sync supabase schema to global config when it changes
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    const schemaString = JSON.stringify(supabaseSchema);
    const lastSchemaString = JSON.stringify(lastSyncedRef.current.schema);

    if (supabaseSchema && schemaString !== lastSchemaString) {
      console.log("[IntegrationProvider] Syncing supabase schema to global config");
      setGlobalConfigNested("supabase.schema", supabaseSchema);
      lastSyncedRef.current.schema = supabaseSchema;
      // Also keep old localStorage key for backward compatibility
      localStorage.setItem("supabaseSchema", JSON.stringify(supabaseSchema));
    }
  }, [supabaseSchema, isHydrated]);

  // Sync supabase credentials to global config when they change
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    if (supabaseUrl && supabaseUrl !== lastSyncedRef.current.url) {
      console.log("[IntegrationProvider] Syncing supabase URL to global config");
      setGlobalConfigNested("supabase.url", supabaseUrl);
      lastSyncedRef.current.url = supabaseUrl;
    }

    if (supabaseKey && supabaseKey !== lastSyncedRef.current.key) {
      console.log("[IntegrationProvider] Syncing supabase key to global config");
      setGlobalConfigNested("supabase.key", supabaseKey);
      lastSyncedRef.current.key = supabaseKey;
    }
  }, [supabaseUrl, supabaseKey, isHydrated]);

  const isSetupComplete = !!(selectedRepo && supabaseSchema);

  const value = {
    github: {
      token: githubToken,
      repository: selectedRepo,
      setRepository: setSelectedRepo,
      setToken: setGithubToken,
    },
    supabase: {
      url: supabaseUrl,
      key: supabaseKey,
      schema: supabaseSchema,
      setCredentials: (url, key) => {
        setSupabaseUrl(url);
        setSupabaseKey(key);
      },
      setSchema: setSupabaseSchema,
    },
    isSetupComplete,
  };

  return (
    <IntegrationCtx.Provider value={value}>
      {children}
    </IntegrationCtx.Provider>
  );
}

export function useIntegrations() {
  const context = useContext(IntegrationCtx);
  if (!context) {
    throw new Error("useIntegrations must be used within IntegrationProvider");
  }
  return context;
}
