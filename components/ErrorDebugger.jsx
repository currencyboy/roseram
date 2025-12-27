"use client";

import { useState } from "react";
import { GeneratedCode, DebugErrorResponse } from "@/lib/types";

export function ErrorDebugger({ code, onApplyFix }) {
  const [error, setError] = useState("");
  const [context, setContext] = useState("");
  const [debugging, setDebugging] = useState(false);
  const [result, setResult] = useState(null);
  const [error_msg, setErrorMsg] = useState(null);

  const handleDebug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!error.trim()) {
      setErrorMsg("Please enter an error message");
      return;
    }

    setDebugging(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.trim(),
          code,
          context: context.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to debug error");

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Debug failed");
    } finally {
      setDebugging(false);
    }
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-lg">🐛 Error Debugger</h3>

      <form onSubmit={handleDebug} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Error Message</label>
          <input
            type="text"
            value={error}
            onChange={(e) => setError(e.target.value)}
            placeholder="e.g., TypeError: Cannot read property 'x' of undefined"
            disabled={debugging}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Context (Optional)</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What were you doing when this error occurred?"
            disabled={debugging}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50 resize-none"
          />
        </div>

        {error_msg && (
          <div className="p-2 bg-red-50 text-red-800 text-sm rounded">
            {error_msg}
          </div>
        )}

        <button
          type="submit"
          disabled={debugging || !error.trim()}
          className="w-full px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 font-medium"
        >
          {debugging ? "Analyzing..." : "Analyze Error"}
        </button>
      </form>

      {result && (
        <div className="space-y-4 p-4 bg-blue-50 rounded border border-blue-200">
          {result.suggestion && (
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Quick Suggestion</h4>
              <p className="text-sm text-blue-800">{result.suggestion}</p>
            </div>
          )}

          {result.explanation && (
            <div>
              <h4 className="font-medium text-blue-900 mb-1">What Went Wrong</h4>
              <p className="text-sm text-blue-800">{result.explanation}</p>
            </div>
          )}

          {result.fixes && result.fixes.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Recommended Fixes</h4>
              <ul className="space-y-1">
                {result.fixes.map((fix, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-blue-800">
                    <span className="text-blue-600 font-bold min-w-fit">{idx + 1}.</span>
                    <span>{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onApplyFix && result.fixes && result.fixes.length > 0 && (
            <button
              onClick={() => onApplyFix(result.fixes![0])}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
            >
              Apply First Fix
            </button>
          )}
        </div>
      )}
    </div>
  );
}
