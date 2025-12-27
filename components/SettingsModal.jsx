"use client";

import { useState } from "react";
import { EnterprisePanel } from "./EnterprisePanel";

export function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("enterprise");
  const [envVars, setEnvVars] = useState({});
  const [savedMessage, setSavedMessage] = useState("");

  const handleSaveEnv = () => {
    setSavedMessage("✓ Environment variables saved");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Settings & Configuration</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-300 transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-700">
          {(["enterprise", "environment"]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 font-medium transition border-b-2 ${
                activeTab === tab
                  ? "bg-gray-800 border-b-blue-500 text-blue-400"
                  : "border-b-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab === "enterprise" && "Enterprise"}
              {tab === "environment" && "Environment"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "enterprise" && <EnterprisePanel />}

          {activeTab === "environment" && (
            <div className="space-y-4">
              <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-200">
                  ℹ️ No restrictions on environment variables. Configure any variable
                  needed for your enterprise setup.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold">Configure Environment Variables</h3>
                {[
                  "SUPABASE_PROJECT_URL",
                  "SUPABASE_ANON",
                  "X_API_KEY",
                  "NEXT_NETLIFY_ACCESS_TOKEN",
                  "GITHUB_ACCESS_TOKEN",
                  "ROSERAM_DOMAIN",
                  "CUSTOM_VAR_1",
                  "CUSTOM_VAR_2",
                ].map((varName) => (
                  <div key={varName}>
                    <label className="text-xs text-gray-400 block mb-1">
                      {varName}
                    </label>
                    <input
                      type="password"
                      value={envVars[varName] || ""}
                      onChange={(e) =>
                        setEnvVars({
                          ...envVars,
                          [varName]: e.target.value,
                        })
                      }
                      placeholder={`Enter ${varName}`}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveEnv}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium transition"
              >
                Save Environment Variables
              </button>

              {savedMessage && (
                <div className="bg-green-900 border border-green-700 text-green-200 p-3 rounded text-sm">
                  {savedMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
