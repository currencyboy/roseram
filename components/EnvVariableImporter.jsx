"use client";

import { useState, useEffect } from "react";
import { Check, AlertCircle, Copy, Upload } from "lucide-react";

export function EnvVariableImporter({ onImport, isOpen = true }) {
  const [config, setConfig] = useState({});
  const [pastedEnv, setPastedEnv] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(null);
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    loadEnvVariables();
  }, []);

  const loadEnvVariables = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/env-config", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({
          github_token: data.GITHUB_ACCESS_TOKEN || "",
          supabase_url: data.SUPABASE_PROJECT_URL || data.NEXT_PUBLIC_SUPABASE_PROJECT_URL || "",
          supabase_anon_key: data.SUPABASE_ANON || data.NEXT_PUBLIC_SUPABASE_ANON || "",
          supabase_service_role: data.SUPABASE_SERVICE_ROLE || "",
          x_api_key: data.X_API_KEY || "",
          netlify_token: data.NEXT_NETLIFY_ACCESS_TOKEN || "",
        });
        setMessage({
          type: "success",
          text: "Environment variables loaded successfully",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to load environment variables",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseEnvString = (envString) => {
    const parsedConfig = {};
    const lines = envString.split("\n");

    const keyMappings = {
      NEXT_PUBLIC_GITHUB_ACCESS_TOKEN: "github_token",
      GITHUB_ACCESS_TOKEN: "github_token",
      GITHUB_TOKEN: "github_token",
      NEXT_PUBLIC_SUPABASE_PROJECT_URL: "supabase_url",
      SUPABASE_PROJECT_URL: "supabase_url",
      SUPABASE_URL: "supabase_url",
      NEXT_PUBLIC_SUPABASE_ANON: "supabase_anon_key",
      SUPABASE_ANON: "supabase_anon_key",
      SUPABASE_ANON_KEY: "supabase_anon_key",
      SUPABASE_SERVICE_ROLE: "supabase_service_role",
      SUPABASE_SERVICE_ROLE_KEY: "supabase_service_role",
      NEXT_PUBLIC_X_API_KEY: "x_api_key",
      X_API_KEY: "x_api_key",
      NEXT_NETLIFY_ACCESS_TOKEN: "netlify_token",
      NETLIFY_ACCESS_TOKEN: "netlify_token",
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim();

        if (key && value) {
          const configKey = keyMappings[key.trim()];
          if (configKey) {
            parsedConfig[configKey] = value;
          }
        }
      }
    });

    return parsedConfig;
  };

  const handlePasteEnv = (e) => {
    const envText = e.target.value;
    setPastedEnv(envText);

    if (envText.trim()) {
      const parsedConfig = parseEnvString(envText);
      setConfig((prev) => ({
        ...prev,
        ...parsedConfig,
      }));

      const foundVars = Object.keys(parsedConfig).filter(
        (key) => parsedConfig[key]
      );

      if (foundVars.length > 0) {
        setMessage({
          type: "success",
          text: `Found and loaded ${foundVars.length} environment variable(s)`,
        });
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const fileContent = await file.text();

      const parsedConfig = parseEnvString(fileContent);
      setConfig((prev) => ({
        ...prev,
        ...parsedConfig,
      }));

      const foundVars = Object.keys(parsedConfig).filter(
        (key) => parsedConfig[key]
      );

      if (foundVars.length > 0) {
        setMessage({
          type: "success",
          text: `Successfully loaded ${foundVars.length} environment variable(s) from file`,
        });
        setPastedEnv(fileContent);
      } else {
        setMessage({
          type: "error",
          text: "No valid environment variables found in file",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `Failed to read file: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyValue = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApplyConfig = () => {
    onImport(config);
    setMessage({
      type: "success",
      text: "✓ Configuration applied - integrations are loading...",
    });
  };

  const handleUpdateField = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getAvailableIntegrations = () => {
    const integrations = [];
    if (config.github_token) integrations.push("GitHub");
    if (config.supabase_url && config.supabase_anon_key) integrations.push("Supabase");
    if (config.x_api_key) integrations.push("xAI");
    if (config.netlify_token) integrations.push("Netlify");
    return integrations;
  };

  if (!isOpen) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 xs:p-4 sm:p-4 md:p-5 lg:p-6 mb-4 xs:mb-5 sm:mb-6">
      <h3 className="font-bold text-xs xs:text-sm sm:text-base text-blue-900 mb-3 xs:mb-3.5 sm:mb-4">Environment Variables Import</h3>

      {isLoading ? (
        <p className="text-xs sm:text-sm text-blue-800">Loading environment variables...</p>
      ) : (
        <>
          <div className="mb-4 xs:mb-5 sm:mb-6 space-y-4 xs:space-y-5">
            <div>
              <label className="block text-xs xs:text-xs sm:text-sm font-medium text-blue-900 mb-2 xs:mb-2.5 sm:mb-3">
                Upload or paste your .env file
              </label>
              <div className="flex gap-2 xs:gap-2.5 sm:gap-3 mb-4 xs:mb-5">
                <label className="flex-1 relative">
                  <input
                    type="file"
                    accept=".env,.txt"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="hidden"
                  />
                  <div className="w-full px-3 xs:px-3 sm:px-4 py-1.5 xs:py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg border-2 border-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs xs:text-xs sm:text-sm font-medium transition-colors">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{isLoading ? "Loading..." : "Upload .env file"}</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="relative py-2 xs:py-2.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs xs:text-xs sm:text-sm">
                <span className="px-2 xs:px-2.5 bg-blue-50 text-gray-500">or paste below</span>
              </div>
            </div>

            <div>
              <label className="block text-xs xs:text-xs sm:text-sm font-medium text-blue-900 mb-2 xs:mb-2.5 sm:mb-3">
                Paste your .env variables
              </label>
              <textarea
                value={pastedEnv}
                onChange={handlePasteEnv}
                placeholder={`GITHUB_ACCESS_TOKEN=ghp_xxx
SUPABASE_PROJECT_URL=https://xxx.supabase.co
SUPABASE_ANON=eyJhbGc...
X_API_KEY=xai_xxx
NETLIFY_ACCESS_TOKEN=nfp_xxx`}
                className="w-full p-2 xs:p-2.5 sm:p-3 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono resize-none min-h-[100px] xs:min-h-[120px] sm:min-h-[150px] md:min-h-[180px]"
              />
              <p className="text-xs text-blue-700 mt-1.5 xs:mt-2 sm:mt-2">
                Automatically detects service credentials from common env formats
              </p>
            </div>
          </div>

          <div className="space-y-2.5 xs:space-y-3 sm:space-y-4 mb-4 xs:mb-5 sm:mb-6">
            {config.github_token && (
              <div className="bg-white p-2.5 xs:p-3 sm:p-3 md:p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 xs:gap-2 sm:gap-0 mb-2.5 xs:mb-2.5 sm:mb-3">
                  <label className="text-xs xs:text-xs sm:text-sm font-medium text-gray-900">GitHub Token</label>
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                </div>
                {editingField === "github_token" ? (
                  <div className="flex flex-col xs:flex-col sm:flex-row gap-1.5 xs:gap-1.5 sm:gap-2">
                    <input
                      type="password"
                      value={config.github_token}
                      onChange={(e) => handleUpdateField("github_token", e.target.value)}
                      className="text-xs flex-1 px-2 xs:px-2 py-1.5 xs:py-1.5 sm:py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setEditingField(null)}
                      className="px-3 xs:px-3 py-1.5 xs:py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap font-medium"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center gap-1.5 xs:gap-1.5 sm:gap-2">
                    <code className="text-xs bg-gray-100 px-2 xs:px-2 py-1 xs:py-1 rounded flex-1 overflow-hidden text-ellipsis break-all">
                      {config.github_token.substring(0, 15)}...
                    </code>
                    <button
                      onClick={() => handleCopyValue("github", config.github_token || "")}
                      className="p-1.5 xs:p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0 transition-colors"
                      title="Copy token"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingField("github_token")}
                      className="px-2.5 xs:px-2.5 py-1 xs:py-1 text-xs text-blue-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                )}
                {copied === "github" && (
                  <p className="text-xs text-green-600 mt-1.5 xs:mt-1.5 sm:mt-2">Copied!</p>
                )}
              </div>
            )}

            {config.supabase_url && config.supabase_anon_key && (
              <div className="bg-white p-2.5 xs:p-3 sm:p-3 md:p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 xs:gap-2 sm:gap-0 mb-2.5 xs:mb-2.5 sm:mb-3">
                  <label className="text-xs xs:text-xs sm:text-sm font-medium text-gray-900">Supabase Configuration</label>
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                </div>
                <div className="space-y-2 xs:space-y-2.5 text-xs">
                  <div>
                    {editingField === "supabase_url" ? (
                      <div className="flex flex-col xs:flex-col sm:flex-row gap-1.5 xs:gap-1.5 sm:gap-2">
                        <input
                          type="text"
                          value={config.supabase_url}
                          onChange={(e) => handleUpdateField("supabase_url", e.target.value)}
                          className="flex-1 px-2 xs:px-2 py-1.5 xs:py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://xxx.supabase.co"
                        />
                        <button
                          onClick={() => setEditingField(null)}
                          className="px-3 xs:px-3 py-1.5 xs:py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap font-medium"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 xs:gap-1.5 sm:gap-2">
                        <p className="text-gray-600 break-all text-xs">URL: {config.supabase_url}</p>
                        <button
                          onClick={() => setEditingField("supabase_url")}
                          className="px-2.5 xs:px-2.5 py-1 xs:py-1 text-xs text-blue-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    {editingField === "supabase_anon_key" ? (
                      <div className="flex flex-col xs:flex-col sm:flex-row gap-1.5 xs:gap-1.5 sm:gap-2">
                        <input
                          type="password"
                          value={config.supabase_anon_key}
                          onChange={(e) => handleUpdateField("supabase_anon_key", e.target.value)}
                          className="flex-1 px-2 xs:px-2 py-1.5 xs:py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => setEditingField(null)}
                          className="px-3 xs:px-3 py-1.5 xs:py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap font-medium"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 xs:gap-1.5 sm:gap-2">
                        <p className="text-gray-600 text-xs">
                          Anon Key: {config.supabase_anon_key.substring(0, 20)}...
                        </p>
                        <button
                          onClick={() => setEditingField("supabase_anon_key")}
                          className="px-2.5 xs:px-2.5 py-1 xs:py-1 text-xs text-blue-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  {config.supabase_service_role && (
                    <div>
                      {editingField === "supabase_service_role" ? (
                        <div className="flex flex-col xs:flex-col sm:flex-row gap-1.5 xs:gap-1.5 sm:gap-2">
                          <input
                            type="password"
                            value={config.supabase_service_role}
                            onChange={(e) => handleUpdateField("supabase_service_role", e.target.value)}
                            className="flex-1 px-2 xs:px-2 py-1.5 xs:py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => setEditingField(null)}
                            className="px-3 xs:px-3 py-1.5 xs:py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap font-medium"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 xs:gap-1.5 sm:gap-2">
                          <p className="text-gray-600 text-xs">
                            Service Role: {config.supabase_service_role.substring(0, 20)}...
                          </p>
                          <button
                            onClick={() => setEditingField("supabase_service_role")}
                            className="px-2.5 xs:px-2.5 py-1 xs:py-1 text-xs text-blue-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {config.x_api_key && (
              <div className="bg-white p-2.5 xs:p-3 sm:p-3 md:p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 xs:gap-2 sm:gap-0 mb-2.5 xs:mb-2.5 sm:mb-3">
                  <label className="text-xs xs:text-xs sm:text-sm font-medium text-gray-900">xAI API Key</label>
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                </div>
                {editingField === "x_api_key" ? (
                  <div className="flex flex-col xs:flex-col sm:flex-row gap-1.5 xs:gap-1.5 sm:gap-2">
                    <input
                      type="password"
                      value={config.x_api_key}
                      onChange={(e) => handleUpdateField("x_api_key", e.target.value)}
                      className="text-xs flex-1 px-2 xs:px-2 py-1.5 xs:py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setEditingField(null)}
                      className="px-3 xs:px-3 py-1.5 xs:py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap font-medium"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center gap-1.5 xs:gap-1.5 sm:gap-2">
                    <p className="text-xs text-gray-600 flex-1">
                      {config.x_api_key.substring(0, 15)}...
                    </p>
                    <button
                      onClick={() => setEditingField("x_api_key")}
                      className="px-2.5 xs:px-2.5 py-1 xs:py-1 text-xs text-blue-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )}

            {config.netlify_token && (
              <div className="bg-white p-2.5 xs:p-3 sm:p-3 md:p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 xs:gap-2 sm:gap-0 mb-2.5 xs:mb-2.5 sm:mb-3">
                  <label className="text-xs xs:text-xs sm:text-sm font-medium text-gray-900">Netlify Token</label>
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                </div>
                {editingField === "netlify_token" ? (
                  <div className="flex flex-col xs:flex-col sm:flex-row gap-1.5 xs:gap-1.5 sm:gap-2">
                    <input
                      type="password"
                      value={config.netlify_token}
                      onChange={(e) => handleUpdateField("netlify_token", e.target.value)}
                      className="text-xs flex-1 px-2 xs:px-2 py-1.5 xs:py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setEditingField(null)}
                      className="px-3 xs:px-3 py-1.5 xs:py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap font-medium"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center gap-1.5 xs:gap-1.5 sm:gap-2">
                    <p className="text-xs text-gray-600 flex-1">
                      {config.netlify_token.substring(0, 15)}...
                    </p>
                    <button
                      onClick={() => setEditingField("netlify_token")}
                      className="px-2.5 xs:px-2.5 py-1 xs:py-1 text-xs text-blue-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {message && (
            <div
              className={`p-2.5 xs:p-3 sm:p-3 md:p-4 rounded-lg text-xs sm:text-sm mb-4 xs:mb-5 sm:mb-6 flex gap-2 xs:gap-2.5 ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="break-words">{message.text}</p>
            </div>
          )}

          <div className="bg-blue-100 p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-lg mb-4 xs:mb-5 sm:mb-6">
            <p className="text-xs xs:text-xs sm:text-sm font-semibold text-blue-900 mb-2 xs:mb-2.5 sm:mb-3">
              Found {getAvailableIntegrations().length} configured integration(s):
            </p>
            <div className="flex flex-wrap gap-1.5 xs:gap-2 sm:gap-2.5">
              {getAvailableIntegrations().map((integration) => (
                <span
                  key={integration}
                  className="bg-blue-600 text-white text-xs px-2 xs:px-2.5 sm:px-3 py-1 xs:py-1 sm:py-1.5 rounded-lg font-medium"
                >
                  {integration}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleApplyConfig}
            disabled={getAvailableIntegrations().length === 0}
            className="w-full px-3 xs:px-3 sm:px-4 py-1.5 xs:py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium"
          >
            Apply Configuration to Integrations
          </button>

          <button
            onClick={loadEnvVariables}
            className="w-full mt-2 xs:mt-2.5 sm:mt-3 px-3 xs:px-3 sm:px-4 py-1.5 xs:py-1.5 sm:py-2 bg-white text-gray-700 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium"
          >
            Refresh Variables
          </button>
        </>
      )}
    </div>
  );
}
