"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getCurrentSession,
  createUserSession,
  saveCredentials,
  getCredentials,
  validateCredentials,
  extractServiceId,
  detectReturningUser,
  mergeUserAccounts,
  saveIntegrationSettings,
  getIntegrationSettings,
  clearUserSession as clearStoredSession,
} from '@/lib/user-session';
import { supabase } from '@/lib/supabase';

const UserSessionContext = createContext(null);

export function UserSessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validationStatus, setValidationStatus] = useState(null);
  const [isMerging, setIsMerging] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      try {
        const existingSession = getCurrentSession();
        
        if (existingSession?.userId) {
          // Validate cached credentials
          const credentials = getCredentials();
          if (credentials) {
            const validationResult = await validateCredentials(credentials);
            if (!validationResult.valid && validationResult.expiredService) {
              setValidationStatus({
                hasExpired: true,
                expiredService: validationResult.expiredService,
                credentialsStillCached: true,
              });
            }
          }

          setSession(existingSession);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  // Create new user session when service connects
  const initializeUserSession = useCallback(async (service, metadata) => {
    try {
      setIsLoading(true);
      const serviceId = extractServiceId(service, metadata);
      
      if (!serviceId) {
        throw new Error(`Could not extract ID from ${service}`);
      }

      // Check for existing user
      const existingSession = getCurrentSession();
      let newSession = existingSession;

      if (!existingSession?.userId) {
        // Create new session for first-time user
        newSession = createUserSession(service, serviceId, metadata);
      } else {
        // Update existing session with new service
        newSession = createUserSession(service, serviceId, metadata);
      }

      if (newSession) {
        setSession(newSession);
        return {
          success: true,
          userId: newSession.userId,
          isNewUser: !existingSession?.userId,
        };
      } else {
        throw new Error('Failed to create user session');
      }
    } catch (error) {
      console.error('Failed to initialize user session:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Store and validate credentials
  const storeCredentials = useCallback(async (credentials, validateNow = true) => {
    try {
      setIsLoading(true);
      
      // Validate before storing
      if (validateNow) {
        const validationResult = await validateCredentials(credentials);
        if (!validationResult.valid) {
          return {
            success: false,
            error: `${validationResult.expiredService} credentials are invalid or expired`,
            expiredService: validationResult.expiredService,
          };
        }
      }

      // Check for returning user before storing
      const returningUserInfo = await detectReturningUser(credentials);
      if (returningUserInfo?.isReturningUser) {
        setValidationStatus({
          isReturningUser: true,
          userId: returningUserInfo.userId,
          lastService: returningUserInfo.lastService,
        });
        
        return {
          success: true,
          isReturningUser: true,
          userId: returningUserInfo.userId,
        };
      }

      // Store credentials
      const syncToSupabase = !!(
        credentials.supabase_url && 
        credentials.supabase_anon_key &&
        session?.userId
      );
      
      const stored = await saveCredentials(credentials, syncToSupabase);
      
      if (stored) {
        setValidationStatus({
          credentialsValid: true,
          lastUpdated: new Date().toISOString(),
        });
        
        return {
          success: true,
          synced: syncToSupabase,
        };
      } else {
        throw new Error('Failed to store credentials');
      }
    } catch (error) {
      console.error('Failed to store credentials:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsLoading(false);
    }
  }, [session?.userId]);

  // Cache integration settings
  const cacheIntegrations = useCallback((settings) => {
    try {
      const success = saveIntegrationSettings(settings);
      return { success };
    } catch (error) {
      console.error('Failed to cache integrations:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(() => {
    return {
      integrations: getIntegrationSettings(),
      credentials: getCredentials(),
    };
  }, []);

  // Handle account merge when duplicate detected
  const mergeAccounts = useCallback(async (secondaryMetadata) => {
    try {
      setIsMerging(true);
      
      if (!session?.userData) {
        throw new Error('No active session to merge into');
      }

      const merged = mergeUserAccounts(session, secondaryMetadata);
      if (merged) {
        setSession({
          ...session,
          userData: merged,
        });
        
        // Sync to Supabase if available
        if (session.userId && getCredentials()?.supabase_url) {
          try {
            await supabase
              .from('user_sessions')
              .upsert({
                user_id: session.userId,
                user_data: merged,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' });
          } catch (supabaseError) {
            console.warn('Failed to sync merged accounts to Supabase:', supabaseError);
          }
        }

        return { success: true, mergedSession: session };
      } else {
        throw new Error('Failed to merge accounts');
      }
    } catch (error) {
      console.error('Failed to merge accounts:', error);
      return { success: false, error: error.message };
    } finally {
      setIsMerging(false);
    }
  }, [session]);

  // Clear session and logout
  const clearSession = useCallback(() => {
    try {
      clearStoredSession();
      setSession(null);
      setValidationStatus(null);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear session:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const value = {
    // Session state
    session,
    isLoading,
    userId: session?.userId,
    isAuthenticated: !!session?.userId,
    validationStatus,

    // Session management
    initializeUserSession,
    storeCredentials,
    cacheIntegrations,
    getCachedData,
    mergeAccounts,
    clearSession,
  };

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error('useUserSession must be used within UserSessionProvider');
  }
  return context;
}
