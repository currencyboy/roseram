"use client";

import { useState } from "react";

export function TopToolbar({
  onGenerate,
  loading,
  error,
  totalTokens,
  onShowHistory,
  onShowSettings,
  onLogout,
  email,
}) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      await onGenerate(prompt);
      setPrompt("");
    }
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 space-y-3">
      {/* Top Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Roseram Builder</h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Tokens Used:</span>
            <span className="font-mono text-white">{totalTokens.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowHistory}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
          >
            History
          </button>
          <button
            onClick={onShowSettings}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
          >
            Settings
          </button>
          <div className="border-l border-gray-700 pl-3">
            <div className="text-xs text-gray-400">{email}</div>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-2 bg-red-900 hover:bg-red-800 rounded text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Prompt Input Row */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to build... (e.g., 'A dark hero section with gradient and CTA button')"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition flex items-center gap-2"
        >
          {loading ? (
            <>
              Generating...
            </>
          ) : (
            <>
              Generate
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}
