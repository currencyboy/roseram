'use client';

import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Copy, Trash2, Loader, ChevronDown, ChevronUp } from 'lucide-react';

export function RevisionHistory({ projectId, filePath, onRestore, isOpen = false }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(isOpen);
  const [selectedRevision, setSelectedRevision] = useState(null);

  useEffect(() => {
    if (filePath && projectId) {
      fetchRevisions();
    }
  }, [projectId, filePath]);

  const fetchRevisions = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/revisions', window.location.origin);
      url.searchParams.append('projectId', projectId);
      if (filePath) {
        url.searchParams.append('filePath', filePath);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch revisions');
      }

      const data = await response.json();
      setRevisions(data.revisions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading revisions');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (revision) => {
    try {
      onRestore(revision);

      await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'rollback',
          filePath: revision.file_path,
          description: `Restored file to revision from ${new Date(revision.created_at).toLocaleString()}`,
        }),
      });
    } catch (err) {
      console.error('Error restoring revision:', err);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString();
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Version History</span>
          {revisions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              {revisions.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          ) : revisions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No revisions yet</p>
              <p className="text-sm">Changes will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {revisions.map((revision) => (
                <div
                  key={revision.id}
                  onClick={() => setSelectedRevision(selectedRevision === revision.id ? null : revision.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRevision === revision.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {revision.change_type === 'generate' ? 'Generated' : 'Edited'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatDate(revision.created_at)}</p>
                      {revision.message && (
                        <p className="text-xs text-gray-700 mt-1 italic">{revision.message}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(revision);
                      }}
                      className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-blue-600"
                      title="Restore this version"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedRevision === revision.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2 font-medium">Content Preview:</p>
                      <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono">
                        <code>{revision.content.substring(0, 500)}{revision.content.length > 500 ? '...' : ''}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
