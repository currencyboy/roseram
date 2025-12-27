"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, RefreshCw } from "lucide-react";

export function DiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([
    {
      timestamp: new Date().toLocaleTimeString(),
      type: "info",
      message: "Diagnostics panel ready",
      details: "Monitor API calls and errors here",
    },
  ]);

  const testGitHub = async () => {
    const timestamp = new Date().toLocaleTimeString();
    try {
      setLogs((prev) => [
        ...prev,
        { timestamp, type: "info", message: "Testing GitHub token validation..." },
      ]);

      const response = await fetch("/api/github/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            type: "success",
            message: `GitHub token valid - Authenticated as ${data.user.login}`,
            details: JSON.stringify(data.user, null, 2),
          },
        ]);
      } else {
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            type: "error",
            message: `GitHub token invalid: ${data.error}`,
            details: data.details || "Check your GITHUB_ACCESS_TOKEN environment variable",
          },
        ]);
      }
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: "error",
          message: "GitHub validation test failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      ]);
    }
  };

  const testSupabase = async () => {
    const timestamp = new Date().toLocaleTimeString();
    try {
      setLogs((prev) => [
        ...prev,
        { timestamp, type: "info", message: "Testing Supabase API..." },
      ]);

      const response = await fetch("/api/supabase/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || "",
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON || "",
        }),
      });

      const data = await response.json();
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: response.ok ? "success" : "error",
          message: `Supabase API: ${response.status}`,
          details: JSON.stringify(data, null, 2),
        },
      ]);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: "error",
          message: "Supabase test failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      ]);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logsText = logs
      .map((log) => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}\n${log.details || ""}`)
      .join("\n\n");
    navigator.clipboard.writeText(logsText);
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <div className="border border-gray-400 bg-white rounded shadow-lg">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3 bg-gray-100 border-b border-gray-400 flex items-center justify-between hover:bg-gray-200"
        >
          <span className="font-semibold text-sm">API Diagnostics</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isOpen && (
          <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
            <div className="flex gap-2">
              <button
                onClick={testGitHub}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test GitHub
              </button>
              <button
                onClick={testSupabase}
                className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Test Supabase
              </button>
              <button
                onClick={clearLogs}
                className="flex-1 px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Clear
              </button>
              <button
                onClick={copyLogs}
                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border ${
                    log.type === "error"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : log.type === "success"
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-blue-300 bg-blue-50 text-blue-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{log.timestamp}</span>
                    <span className="text-xs uppercase">{log.type}</span>
                  </div>
                  <p className="mt-1">{log.message}</p>
                  {log.details && (
                    <pre className="mt-1 p-2 bg-white bg-opacity-50 rounded text-xs overflow-x-auto max-h-32">
                      {log.details}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
