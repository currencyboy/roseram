import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// IMPORTANT: In Next.js, only NEXT_PUBLIC_* prefixed variables are available on the client-side
// Server-only variables (without NEXT_PUBLIC_) won't be accessible in the browser
// For client-side access, use one of these:
// - NEXT_PUBLIC_SUPABASE_URL
// - NEXT_PUBLIC_SUPABASE_PROJECT_URL
// - VITE_PROJECT_URL (Vite convention fallback)

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ||
  process.env.VITE_PROJECT_URL;

// Similarly for the anon key, use NEXT_PUBLIC_ prefixed variables
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON ||
  process.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status in development and production (client-side)
if (typeof window !== 'undefined') {
  const isPlaceholder = supabaseUrl === "https://placeholder.supabase.co" || supabaseAnonKey === "placeholder-key";
  const isConfigured = !isPlaceholder && !!(supabaseUrl && supabaseAnonKey);

  console.log('[Supabase Config] CLIENT-SIDE Configuration:', {
    configured: isConfigured,
    isPlaceholder,
    status: isPlaceholder ? '❌ USING PLACEHOLDER VALUES' : (isConfigured ? '✅ PROPERLY CONFIGURED' : '⚠️ MISSING CONFIGURATION'),
    urlStatus: supabaseUrl ? `✓ Found (${supabaseUrl.substring(0, 50)}...)` : '✗ Missing',
    keyStatus: supabaseAnonKey ? `✓ Found (${supabaseAnonKey.substring(0, 20)}...)` : '✗ Missing',
    note: 'Only NEXT_PUBLIC_* and VITE_* prefixed variables are accessible on client-side',
    clientSideVarsAvailable: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PROJECT_URL: !!process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
      VITE_PROJECT_URL: !!process.env.VITE_PROJECT_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON: !!process.env.NEXT_PUBLIC_SUPABASE_ANON,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
    }
  });
}
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create a dummy client if Supabase is not configured, to prevent app from crashing
const defaultUrl = "https://placeholder.supabase.co";
const defaultKey = "placeholder-key";

export const supabase = createSupabaseClient(
  supabaseUrl || defaultUrl,
  supabaseAnonKey || defaultKey
);

export const supabaseServer =
  supabaseUrl && supabaseAnonKey && serviceRoleKey
    ? createSupabaseClient(supabaseUrl, serviceRoleKey)
    : null;

// Log server client initialization status in development
if (process.env.NODE_ENV === 'development') {
  console.log('[Supabase] Server client initialized:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceRole: !!serviceRoleKey,
    serverClientReady: !!supabaseServer,
  });
}

export const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY;
export const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

// Export a function to dynamically check if Supabase is configured
// This checks if we have the actual Supabase client configured with real credentials
// (not the placeholder defaults)
export function isSupabaseConfigured() {
  // Check if we're using placeholder defaults
  const isPlaceholder =
    supabaseUrl === "https://placeholder.supabase.co" ||
    supabaseAnonKey === "placeholder-key";

  return !isPlaceholder && !!(supabaseUrl && supabaseAnonKey);
}

// Export createClient function for dynamic client creation
export const createClient = createSupabaseClient;

// Export server-side Supabase client creator function
export async function createServerSupabaseClient() {
  return supabaseServer || supabase;
}
