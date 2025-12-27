'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, Copy } from 'lucide-react';

const DiffLine = ({ line, type, lineNumber }) => {
  const getLineColor = () => {
    switch (type) {
      case 'add':
        return 'bg-green-50 text-green-900 border-l-4 border-green-500';
      case 'remove':
        return 'bg-red-50 text-red-900 border-l-4 border-red-500';
      case 'header':
        return 'bg-blue-50 text-blue-900 font-mono text-xs font-semibold';
      default:
        return 'bg-white text-gray-900';
    }
  };

  const getPrefix = () => {
    switch (type) {
      case 'add':
        return '+';
      case 'remove':
        return '-';
      default:
        return ' ';
    }
  };

  return (
    <div className={`px-4 py-1 font-mono text-sm ${getLineColor()}`}>
      <span className="inline-block w-6 text-right mr-2 text-gray-500 select-none">
        {lineNumber ? lineNumber : ''}
      </span>
      <span className="inline-block w-4 text-gray-500">{getPrefix()}</span>
      <code>{line}</code>
    </div>
  );
};

const generateDiff = (original = '', newContent) => {
  const origLines = original.split('\n');
  const newLines = newContent.split('\n');
  const diff = [];

  const contextSize = 3;
  const maxLines = Math.max(origLines.length, newLines.length);

  for (let i = 0; i < Math.min(maxLines, 20); i++) {
    const origLine = origLines[i] || '';
    const newLine = newLines[i] || '';

    if (origLine === newLine) {
      diff.push({ line: origLine, type: 'context' });
    } else {
      if (origLine) diff.push({ line: origLine, type: 'remove' });
      if (newLine) diff.push({ line: newLine, type: 'add' });
    }
  }

  if (maxLines > 20) {
    diff.push({ line: `... and ${maxLines - 20} more lines`, type: 'context' });
  }

  return diff;
};

export function FileDiffPreview({
  changes,
  onApply,
  onCancel,
  loading = false,
}) {
  const [expandedFiles, setExpandedFiles] = useState(
    new Set(changes.map(c => c.path))
  );
  const [applying, setApplying] = useState(false);

  const toggleFileExpanded = (path) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply(changes);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Review Changes</h2>
          <p className="text-sm text-gray-600 mt-1">{changes.length} file(s) will be modified</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {changes.map((change) => (
          <div key={change.path} className="border-b border-gray-200">
            <button
              onClick={() => toggleFileExpanded(change.path)}
              className="w-full px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {expandedFiles.has(change.path) ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
                <div className="text-left">
                  <p className="font-medium text-gray-900">{change.path}</p>
                  <p className="text-xs text-gray-600">
                    {change.isNew ? 'New file' : 'Modified'}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {change.language || 'text'}
              </span>
            </button>

            {expandedFiles.has(change.path) && (
              <div className="px-6 py-4 bg-white space-y-2">
                {generateDiff(change.originalContent, change.newContent).map((line, idx) => (
                  <DiffLine
                    key={idx}
                    line={line.line}
                    type={line.type}
                    lineNumber={idx + 1}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={applying}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={applying || loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
        >
          {applying ? (
            <>
              <span className="animate-spin inline-block">⏳</span>
              Applying...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Apply Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
