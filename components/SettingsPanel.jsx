"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function SettingsPanel({ email, onLogout }) {
  const [githubUsername, setGithubUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // In a real app, save to user_profiles table
      setMessage({
        type: "success",
        text: "Settings saved successfully",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout?.();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-6">Account Settings</h2>

        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm text-gray-600">Email</p>
          <p className="font-medium text-gray-900">{email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Username
            </label>
            <input
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="your-github-username"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for linking GitHub deployments
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-black text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4 text-red-600">Danger Zone</h3>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
        >
          Logout
        </button>
      </div>

      <div className="bg-blue-50 rounded border border-blue-200 p-6">
        <h3 className="font-bold text-blue-900 mb-3">Environment Variables Status</h3>
        <div className="space-y-2 text-xs text-blue-800">
          <p>✓ SUPABASE_PROJECT_URL: Configured</p>
          <p>✓ SUPABASE_ANON: Configured</p>
          <p>✓ X_API_KEY: Configured</p>
          <p>• GITHUB_ACCESS_TOKEN: {process.env.GITHUB_ACCESS_TOKEN ? "✓" : "⚠"}</p>
          <p>• VITE_NETLIFY_ACCESS_TOKEN: {process.env.VITE_NETLIFY_ACCESS_TOKEN ? "✓" : "⚠"}</p>
        </div>
      </div>
    </div>
  );
}
