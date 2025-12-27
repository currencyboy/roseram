"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft, Loader, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { resetPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function FloatingAuthModal({ isOpen, onClose, required = false }) {
  const { signUp, signIn, session, signOut } = useAuth();
  const [mode, setMode] = useState("login"); // login, signup, reset, profile
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (session?.user) {
        setMode("profile");
        console.log("User profile mode:", session.user.email);
      } else {
        setMode("login");
        console.log("No session, showing login");
      }
    }
  }, [isOpen, session?.user]);

  if (!isOpen) return null;

  const handleClose = required ? null : onClose;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Validate inputs
      if (!email?.trim()) {
        setError("Email is required");
        setLoading(false);
        return;
      }

      if (!password) {
        setError("Password is required");
        setLoading(false);
        return;
      }

      console.log('[FloatingAuthModal] Attempting sign in with:', { email: email.trim() });

      const result = await signIn(email.trim(), password);

      console.log('[FloatingAuthModal] Sign in result:', {
        hasError: !!result?.error,
        hasData: !!result?.data,
        hasSession: !!result?.data?.session,
        errorMessage: result?.error?.message,
      });

      if (result.error) {
        // Use friendly message if available
        const displayError = result.error.friendlyMessage || result.error.message || "Sign in failed";
        const suggestedAction = result.error.suggestedAction || "";

        let errorMsg = displayError;
        if (suggestedAction) {
          errorMsg = `${displayError}\n\n${suggestedAction}`;
        }

        setError(errorMsg);
        setLoading(false);

        // Log detailed error for debugging
        console.error("[FloatingAuthModal] Sign in error:", {
          message: result.error.message,
          friendlyMessage: result.error.friendlyMessage,
          status: result.error.status,
          suggestedAction: result.error.suggestedAction,
          fullError: result.error,
        });
        return;
      }

      // Check if we have a user but no session (email confirmation case)
      if (result.data?.user && !result.data?.session) {
        setError("Account found but email confirmation may be required. Check your email inbox or spam folder for a confirmation link.");
        setLoading(false);
        console.warn("User exists but no session:", result.data.user.email);
        return;
      }

      // Explicitly fetch session after sign in to ensure it's loaded
      if (result.data?.session) {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !currentSession) {
          setError("Account found but unable to create session. Please try again or contact support.");
          setLoading(false);
          console.error("Session error:", sessionError);
          return;
        }

        setSuccess("Sign in successful! ✓");
        console.log("Signed in successfully:", currentSession.user.email);

        // Clear form and close modal
        setTimeout(() => {
          setEmail("");
          setPassword("");
          onClose();
        }, 800);
      } else {
        // No error, but also no session - this is unexpected
        setError("Sign in completed but no session was created. Please try again.");
        setLoading(false);
        console.error("[FloatingAuthModal] Unexpected: no error but no session");
      }
    } catch (err) {
      console.error("Sign in exception:", err);
      const errorMsg = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(`${errorMsg}\n\nIf the problem persists, try clearing your browser storage and refreshing.`);
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password);

      if (result.error) {
        const errorMessage = result.error.friendlyMessage || result.error.message || "Sign up failed";
        setError(errorMessage);
        console.error("[FloatingAuthModal] Sign up error:", result.error);
        return;
      }

      setSuccess("Account created! You can now sign in with your credentials.");
      console.log("[FloatingAuthModal] Sign up successful:", result.data?.user?.email);

      setTimeout(() => {
        setMode("login");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setSuccess(null);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sign up failed";
      setError(errorMessage);
      console.error("[FloatingAuthModal] Sign up exception:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess("Password reset email sent! Check your inbox for instructions.");
      setTimeout(() => {
        setMode("login");
        setEmail("");
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset password failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBackButton = () => {
    setError(null);
    setSuccess(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setMode("login");
  };

  const user = session?.user;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Back Button for non-login modes */}
        {mode !== "login" && mode !== "profile" && (
          <button
            onClick={handleBackButton}
            className="mb-4 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Login Mode */}
        {mode === "login" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your credentials to continue
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 space-y-2 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up
                </button>
              </p>
              <p className="text-sm text-gray-600 text-center">
                Forgot password?{" "}
                <button
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                    setEmail("");
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Reset it
                </button>
              </p>
            </div>
          </>
        )}

        {/* Sign Up Mode */}
        {mode === "signup" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-sm text-gray-600 mb-6">
              Create a new account to get started
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </>
        )}

        {/* Reset Password Mode */}
        {mode === "reset" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your email to receive a password reset link
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sending email...
                  </>
                ) : (
                  "Send Reset Email"
                )}
              </button>
            </form>
          </>
        )}

        {/* User Profile Mode */}
        {mode === "profile" && user && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Account</h2>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                  Email
                </p>
                <p className="text-lg text-gray-900 font-medium">{user.email}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                  User ID
                </p>
                <p className="text-sm text-gray-900 font-mono break-all">{user.id}</p>
              </div>

              {user.user_metadata?.display_name && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                    Display Name
                  </p>
                  <p className="text-lg text-gray-900 font-medium">
                    {user.user_metadata.display_name}
                  </p>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                  Account Created
                </p>
                <p className="text-lg text-gray-900 font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              {user.last_sign_in_at && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                    Last Sign In
                  </p>
                  <p className="text-lg text-gray-900 font-medium">
                    {new Date(user.last_sign_in_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    onClose();
                  } catch (err) {
                    setError("Failed to sign out");
                  }
                }}
                className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
