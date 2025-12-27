"use client";

import { useState } from "react";

export function PromptInput({ onSubmit, loading = false }) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await onSubmit(prompt);
    setPrompt("");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        placeholder="Describe what you want to build. E.g., 'A beautiful hero section with a gradient background and call-to-action button'"
        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50"
        rows={3}
      />
      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition"
      >
        {loading ? "Generating..." : "Generate Code"}
      </button>
    </form>
  );
}
