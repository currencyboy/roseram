"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/types";

export function AdvancedPromptInput({
  onSubmit,
  onEnhancePrompt,
  loading = false,
  chatHistory = [],
}) {
  const [prompt, setPrompt] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef(null);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      setEnhanceError("Enter a prompt to enhance");
      return;
    }

    setEnhancing(true);
    setEnhanceError(null);

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("Failed to enhance prompt");

      const data = await response.json();
      const enhanced = data.enhanced_prompt;

      setPrompt(enhanced);
      onEnhancePrompt?.(enhanced);
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : "Enhancement failed");
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    onSubmit(prompt, chatHistory);
    setPrompt("");
    setShowHistory(false);
  };

  const handleSelectFromHistory = (message) => {
    if (message.role === "user") {
      setPrompt(message.content);
      setShowHistory(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        200
      ) + "px";
    }
  }, [prompt]);

  const userMessages = chatHistory.filter((m) => m.role === "user");

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to build... Press Ctrl+Enter to submit"
          disabled={loading}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 resize-none"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              handleSubmit(e);
            }
          }}
        />

        {chatHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="absolute bottom-2 right-2 text-xs text-gray-600 hover:text-gray-800 bg-white px-2 py-1 rounded border border-gray-200"
          >
            History ({userMessages.length})
          </button>
        )}
      </div>

      {showHistory && userMessages.length > 0 && (
        <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-gray-700">Previous prompts:</p>
          {userMessages.slice(-5).reverse().map((msg, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectFromHistory(msg)}
              className="block w-full text-left text-sm p-2 rounded hover:bg-gray-200 truncate"
            >
              {msg.content}
            </button>
          ))}
        </div>
      )}

      {enhanceError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {enhanceError}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleEnhancePrompt}
          disabled={loading || enhancing || !prompt.trim()}
          className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {enhancing ? "Enhancing..." : "Enhance"}
        </button>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="flex-1 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Code"}
        </button>
      </div>

      <p className="text-xs text-gray-600">
        Tip: Use the enhance button to improve your prompt with technical details
      </p>
    </form>
  );
}
