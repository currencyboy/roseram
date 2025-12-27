"use client";

import { useState, useEffect } from "react";
import { Loader, Check, AlertCircle } from "lucide-react";

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (err) {
    return null;
  }
}

function deriveSupabaseUrlFromKey(key) {
  try {
    const payload = decodeJWT(key);
    if (!payload) {
      return null;
    }

    let projectId = null;
    if (payload.sub && typeof payload.sub === 'string') {
      projectId = payload.sub.split('-')[0];
    }

    if (projectId && projectId.length > 0) {
      return `https://${projectId}.supabase.co`;
    }

    return null;
  } catch (err) {
    return null;
  }
}

export function SupabaseIntegration({ onSchemaSelected, isComplete, preloadedUrl, preloadedKey }) {
  const [url, setUrl] = useState(preloadedUrl || "");
  const [key, setKey] = useState(preloadedKey || "");
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInput, setShowInput] = useState(!isComplete);

  useEffect(() => {
    if (preloadedKey && preloadedKey !== key) {
      setKey(preloadedKey);
    }
    if (preloadedUrl && preloadedUrl !== url) {
      setUrl(preloadedUrl);
    }
    if (preloadedKey && (preloadedKey !== key || preloadedUrl !== url)) {
      setError(null);
      // Auto-fetch schema when new key is preloaded (URL will be derived)
      setTimeout(() => {
        const derivedUrl = deriveSupabaseUrlFromKey(preloadedKey);
        autoFetchSchema(derivedUrl || preloadedUrl, preloadedKey);
      }, 100);
    }
  }, [preloadedUrl, preloadedKey]);

  const autoFetchSchema = async (urlToUse, keyToUse) => {
    if (!keyToUse.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const finalUrl = urlToUse || deriveSupabaseUrlFromKey(keyToUse);
      const response = await fetch("/api/supabase/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl, key: keyToUse }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch schema");
      }

      const schemaData = await response.json();
      setSchema(schemaData);
      setUrl(finalUrl);
      onSchemaSelected(finalUrl, keyToUse, schemaData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schema");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSchema = async () => {
    if (!key.trim()) {
      setError("Please enter Supabase Anon Key");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const derivedUrl = deriveSupabaseUrlFromKey(key) || url;

      if (!derivedUrl) {
        throw new Error("Could not determine Supabase project URL from the provided key");
      }

      setUrl(derivedUrl);
      const response = await fetch("/api/supabase/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: derivedUrl, key }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch schema");
      }

      const schemaData = await response.json();
      setSchema(schemaData);
      onSchemaSelected(derivedUrl, key, schemaData);
      setShowInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schema");
    } finally {
      setLoading(false);
    }
  };

  if (isComplete && schema) {
    return (
      <div className="p-4 border border-black">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-5 h-5" />
          <h3 className="font-semibold">Supabase Connected</h3>
        </div>
        <div>
          <p className="text-sm mb-2">Tables: {schema.tables.length}</p>
          <div className="text-xs space-y-1">
            {schema.tables.slice(0, 5).map((table) => (
              <p key={table} className="text-gray-600">• {table}</p>
            ))}
            {schema.tables.length > 5 && (
              <p className="text-gray-600">... and {schema.tables.length - 5} more</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowInput(true)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Change Credentials
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showInput ? (
        <>
          <div>
            <label className="block text-sm mb-2">Supabase Anon Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiI..."
              className="w-full px-3 py-2 border border-black outline-none text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">Project URL will be automatically derived from your anon key</p>
          </div>

          <button
            onClick={handleFetchSchema}
            disabled={loading || !key.trim()}
            className="w-full px-4 py-2 bg-black text-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Loading schema...
              </>
            ) : (
              "Connect & Load Schema"
            )}
          </button>
        </>
      ) : null}

      {error && (
        <div className="p-3 border border-black bg-white flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-700">{error}</p>
            <div className="text-xs text-gray-600 mt-2 space-y-2">
              <p className="font-semibold">Troubleshooting:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Verify URL format: should be exactly <code className="bg-gray-100 px-1">https://xxxxx.supabase.co</code></li>
                <li>Verify the anon key is correctly copied (long JWT token starting with <code className="bg-gray-100 px-1">eyJ...</code>)</li>
                <li>Check Supabase project status: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">supabase.com/dashboard</a></li>
                <li>Anon keys have limited permissions - if this fails, try using the Service Role Key instead</li>
                <li>Ensure REST API is enabled in Supabase project settings</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {schema && showInput === false && (
        <div className="p-3 border border-black bg-gray-50">
          <p className="text-sm font-semibold mb-2">Schema loaded successfully</p>
          <p className="text-xs text-gray-600">{schema.tables.length} tables found</p>
        </div>
      )}
    </div>
  );
}
