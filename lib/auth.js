import { supabase } from "./supabase";

export async function signUp(email, password) {
  try {
    const { supabase: sb, isSupabaseConfigured } = await import('./supabase');

    if (!sb) {
      throw new Error('Supabase client not initialized');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not properly configured. Please verify your environment variables.');
    }

    const trimmedEmail = email?.trim?.() || email;

    // Validate inputs
    if (!trimmedEmail) {
      return {
        error: {
          message: 'Email is required',
          friendlyMessage: 'Please enter your email address.',
          status: 400,
        },
        data: null,
      };
    }

    if (!password) {
      return {
        error: {
          message: 'Password is required',
          friendlyMessage: 'Please enter a password.',
          status: 400,
        },
        data: null,
      };
    }

    if (password.length < 6) {
      return {
        error: {
          message: 'Password too short',
          friendlyMessage: 'Password must be at least 6 characters long.',
          status: 400,
        },
        data: null,
      };
    }

    const result = await sb.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });

    console.log('[AUTH] Sign up result:', {
      hasError: !!result.error,
      hasSession: !!result.data?.session,
      hasUser: !!result.data?.user,
      errorStatus: result.error?.status,
      errorMessage: result.error?.message,
      userEmail: result.data?.user?.email,
    });

    // Handle specific error cases
    if (result.error) {
      const errorCode = result.error.status;
      const errorMsg = result.error.message?.toLowerCase() || '';

      if (errorCode === 400) {
        if (errorMsg.includes('already registered')) {
          result.error.friendlyMessage = 'This email is already registered. Please sign in instead.';
          result.error.suggestedAction = 'Try using the Sign In option.';
        } else if (errorMsg.includes('invalid email')) {
          result.error.friendlyMessage = 'Please enter a valid email address.';
        }
      } else if (!errorCode || errorCode >= 500) {
        result.error.friendlyMessage = 'Unable to create account. Please check your internet connection and try again.';
      }
    }

    return result;
  } catch (error) {
    console.error('[AUTH] Sign up exception:', error);

    const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');

    return {
      error: {
        message: error.message || 'Sign up failed',
        friendlyMessage: isNetworkError
          ? 'Network connection error. Please check your internet and try again.'
          : 'An error occurred during sign up. Please try again.',
        suggestedAction: isNetworkError
          ? 'Verify your internet connection and try again.'
          : undefined,
      },
      data: null,
    };
  }
}

export async function signIn(email, password) {
  try {
    // Check if Supabase is configured
    const { supabase: sb, isSupabaseConfigured } = await import('./supabase');

    if (!sb) {
      throw new Error('Supabase client not initialized');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not properly configured. Please verify your environment variables.');
    }

    const trimmedEmail = email?.trim?.() || email;

    // Validate inputs
    if (!trimmedEmail) {
      return {
        error: {
          message: 'Email is required',
          friendlyMessage: 'Please enter your email address.',
          status: 400,
        },
        data: null,
      };
    }

    if (!password) {
      return {
        error: {
          message: 'Password is required',
          friendlyMessage: 'Please enter your password.',
          status: 400,
        },
        data: null,
      };
    }

    // Attempt sign in
    const result = await sb.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    console.log('[AUTH] Sign in result:', {
      hasError: !!result.error,
      hasSession: !!result.data?.session,
      hasUser: !!result.data?.user,
      errorStatus: result.error?.status,
      errorMessage: result.error?.message,
      userEmail: result.data?.user?.email,
      fullResult: {
        userPresent: !!result.data?.user,
        sessionPresent: !!result.data?.session,
        errorType: result.error?.name,
      },
    });

    // Handle specific error cases
    if (result.error) {
      const errorCode = result.error.status;
      const errorMsg = result.error.message?.toLowerCase() || '';

      // Provide more helpful error messages
      if (errorCode === 400 || errorCode === 401) {
        if (errorMsg.includes('invalid login') || errorMsg.includes('invalid credentials')) {
          result.error.friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
          result.error.suggestedAction = 'If you don\'t have an account yet, please sign up first.';
        } else if (errorMsg.includes('email not confirmed')) {
          result.error.friendlyMessage = 'Please confirm your email address before signing in.';
          result.error.suggestedAction = 'Check your email for a confirmation link.';
        } else if (errorMsg.includes('user not found')) {
          result.error.friendlyMessage = 'No account found with this email address.';
          result.error.suggestedAction = 'Please create an account or check if you used a different email.';
        }
      } else if (!errorCode || errorCode >= 500) {
        result.error.friendlyMessage = 'Unable to connect to the authentication service. Please check your internet connection and try again.';
        result.error.suggestedAction = 'If the problem persists, please try again later.';
      }
    }

    return result;
  } catch (error) {
    console.error('[AUTH] Sign in exception:', error);

    // Check if it's a network error
    const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');

    return {
      error: {
        message: error.message || 'Sign in failed',
        friendlyMessage: isNetworkError
          ? 'Network connection error. Please check your internet and try again.'
          : 'An error occurred during sign in. Please try again.',
        suggestedAction: isNetworkError
          ? 'Verify your internet connection and try again.'
          : undefined,
      },
      data: null,
    };
  }
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
  });
}

export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({
    password: newPassword,
  });
}

export async function updateUserProfile(updates) {
  return supabase.auth.updateUser({
    data: updates,
  });
}
