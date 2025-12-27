'use client';

import { useState } from 'react';

export function CodePanel({
  code,
  onCodeChange,
  activeTab,
  onTabChange,
}) {
  const [showMinimap, setShowMinimap] = useState(true);

  const tabs = [
    { id: 'html', label: 'HTML', icon: null },
    { id: 'css', label: 'CSS', icon: null },
    { id: 'js', label: 'JavaScript', icon: null },
  ];

  const currentCode =
    activeTab === 'html'
      ? code.html
      : activeTab === 'css'
        ? code.css
        : code.javascript;

  const handleChange = (newValue) => {
    if (activeTab === 'html') {
      onCodeChange({ ...code, html: newValue });
    } else if (activeTab === 'css') {
      onCodeChange({ ...code, css: newValue });
    } else {
      onCodeChange({ ...code, javascript: newValue });
    }
  };

  return (
    <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="flex border-b border-gray-700 bg-gray-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === tab.id
                ? 'bg-gray-800 border-b-blue-500 text-blue-400'
                : 'border-b-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <textarea
          value={currentCode}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm border-0 resize-none focus:outline-none focus:ring-0"
          spellCheck="false"
        />
      </div>

      <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 text-xs text-gray-500 flex justify-between">
        <div>
          Lines: {currentCode.split('\n').length} | Characters:{' '}
          {currentCode.length}
        </div>
        <div>
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className="text-gray-400 hover:text-gray-300 transition"
          >
            {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
          </button>
        </div>
      </div>
    </div>
  );
}
