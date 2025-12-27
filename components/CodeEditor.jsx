"use client";

import { useState } from "react";

export function CodeEditor({
  html,
  css,
  javascript,
  onUpdate,
}) {
  const [activeTab, setActiveTab] = useState(
    "preview"
  );

  const iframeContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>${html}<script>${javascript}</script></body>
</html>`;

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex border-b">
        {(
          ["preview", "html", "css", "js"]
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === tab
                ? "bg-purple-50 text-purple-700 border-b-2 border-purple-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab === "js" ? "JavaScript" : tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "preview" && (
          <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <iframe
              srcDoc={iframeContent}
              className="w-full h-96 border-0"
              title="Code Preview"
              sandbox="allow-scripts"
            />
          </div>
        )}

        {activeTab === "html" && (
          <textarea
            value={html}
            onChange={(e) => onUpdate?.(e.target.value, css, javascript)}
            className="w-full h-96 p-3 font-mono text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        )}

        {activeTab === "css" && (
          <textarea
            value={css}
            onChange={(e) => onUpdate?.(html, e.target.value, javascript)}
            className="w-full h-96 p-3 font-mono text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        )}

        {activeTab === "js" && (
          <textarea
            value={javascript}
            onChange={(e) => onUpdate?.(html, css, e.target.value)}
            className="w-full h-96 p-3 font-mono text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        )}
      </div>
    </div>
  );
}
