/**
 * Authentication Diagnostics Utility
 * Helps identify issues with Supabase configuration and authentication
 */

import { supabase, isSupabaseConfigured } from './supabase';

export async function runAuthDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured,
    checks: {},
  };

  // Check 1: Supabase client
  try {
    diagnostics.checks.supabaseClient = {
      status: supabase ? 'OK' : 'ERROR',
      message: supabase ? 'Supabase client initialized' : 'Supabase client is null',
    };
  } catch (err) {
    diagnostics.checks.supabaseClient = {
      status: 'ERROR',
      message: err.message,
    };
  }

  // Check 2: Current session
  try {
    const { data, error } = await supabase.auth.getSession();
    diagnostics.checks.currentSession = {
      status: error ? 'ERROR' : (data?.session ? 'ACTIVE' : 'NONE'),
      message: error ? error.message : (data?.session ? `Session for ${data.session.user?.email}` : 'No active session'),
      userEmail: data?.session?.user?.email,
    };
  } catch (err) {
    diagnostics.checks.currentSession = {
      status: 'ERROR',
      message: err.message,
    };
  }

  // Check 3: Auth state subscription
  try {
    const { data, error } = await supabase.auth.onAuthStateChange((event, session) => {
      // This just tests if subscription works
    });

    diagnostics.checks.authStateSubscription = {
      status: error ? 'ERROR' : 'OK',
      message: error ? error.message : 'Auth state subscription functional',
    };

    if (data?.subscription) {
      data.subscription.unsubscribe();
    }
  } catch (err) {
    diagnostics.checks.authStateSubscription = {
      status: 'ERROR',
      message: err.message,
    };
  }

  return diagnostics;
}

export function logAuthDiagnostics(diagnostics) {
  console.group('[AUTH DIAGNOSTICS]');
  console.log('Timestamp:', diagnostics.timestamp);
  console.log('Supabase Configured:', diagnostics.supabaseConfigured);
  console.table(diagnostics.checks);
  console.groupEnd();
  
  return diagnostics;
}

export async function checkAndLogDiagnostics() {
  if (typeof window === 'undefined') return;
  
  const diagnostics = await runAuthDiagnostics();
  logAuthDiagnostics(diagnostics);
  
  // Return summary for UI
  const allOK = Object.values(diagnostics.checks).every(
    check => check.status === 'OK' || check.status === 'ACTIVE' || check.status === 'NONE'
  );
  
  return {
    allOK,
    diagnostics,
  };
}
