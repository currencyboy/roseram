"use client";

import { useState } from "react";
import Link from "next/link";

export function Sidebar({ activeTab, onTabChange, email }) {
  const tabs = [
    { id: "editor", label: "Code Editor", icon: null },
    { id: "projects", label: "Projects", icon: null },
    { id: "integrations", label: "Integrations", icon: null },
    { id: "settings", label: "Settings", icon: null },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-black">Roseram</h2>
        <p className="text-xs text-gray-600 mt-1">{email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full text-left px-4 py-3 rounded mb-2 transition ${
              activeTab === tab.id
                ? "bg-black text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        <p>v1.0.0</p>
        <p className="mt-1">Ready for production</p>
      </div>
    </div>
  );
}
