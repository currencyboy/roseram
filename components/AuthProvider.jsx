"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { signUp as authSignUp, signIn as authSignIn, signOut as authSignOut } from "@/lib/auth";
import { checkAndLogDiagnostics } from "@/lib/auth-diagnostics";

const AuthContext = createContext({
  session: null,
  loading: false,
  isConfigured: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let subscription;

    const initializeAuth = async () => {
      if (!isSupabaseConfigured()) {
        console.warn("Supabase is not configured.");
        return;
      }

      if (initRef.current) {
        return;
      }

      initRef.current = true;
      setLoading(true);

      try {
        // Run diagnostics in development
        if (process.env.NODE_ENV === 'development') {
          await checkAndLogDiagnostics();
        }

        // Get current session
        const { data, error } = await supabase.auth.getSession();
        if (isMounted) {
          if (error) {
            console.error("[AuthProvider] Auth error:", error);
            setSession(null);
          } else {
            console.log("[AuthProvider] Initial session loaded:", data?.session?.user?.email);
            setSession(data?.session || null);
          }
        }
      } catch (error) {
        console.error("[AuthProvider] Auth initialization error:", error);
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      // Set up subscription for future changes
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          console.log("Auth state changed:", event, newSession?.user?.email);
          if (isMounted) {
            setSession(newSession);
          }
        }
      );

      subscription = authSubscription;
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleSignUp = async (email, password) => {
    try {
      const result = await authSignUp(email, password);
      // Return the full result object so callers can handle both success and error cases
      return result;
    } catch (error) {
      // Only throw for unexpected exceptions
      console.error('[AuthProvider] Sign up exception:', error);
      throw error;
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      const result = await authSignIn(email, password);

      // Return the full result object so callers can handle both success and error cases
      if (result.error) {
        console.warn('[AuthProvider] Sign in returned error:', result.error.message);
        return result; // Return the result with error, don't throw
      }

      // Explicitly update session state after successful sign-in
      if (result.data?.session) {
        setSession(result.data.session);
        console.log("Session updated after sign in:", result.data.session.user.email);
      }

      return result;
    } catch (error) {
      // Only throw for unexpected exceptions, not auth errors
      console.error('[AuthProvider] Sign in exception:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      const result = await authSignOut();
      if (result.error) {
        throw result.error;
      }
      setSession(null);
      return result.data;
    } catch (error) {
      throw error;
    }
  };

  // Ensure session has access_token for API calls
  const sessionWithToken = session && {
    ...session,
    access_token: session.access_token || session.session?.access_token,
  };

  return (
    <AuthContext.Provider
      value={{
        session: sessionWithToken,
        loading,
        isConfigured: isSupabaseConfigured(),
        signUp: handleSignUp,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
