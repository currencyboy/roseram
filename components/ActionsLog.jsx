'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Zap, Upload, RotateCcw, Plus, Trash2, Edit, Loader, ChevronDown, ChevronUp } from 'lucide-react';

export function ActionsLog({ projectId, isOpen = false, onRefresh }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(isOpen);

  useEffect(() => {
    if (projectId) {
      fetchActions();
      const interval = setInterval(fetchActions, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId]);

  const fetchActions = async () => {
    try {
      const url = new URL('/api/actions', window.location.origin);
      url.searchParams.append('projectId', projectId);
      url.searchParams.append('limit', '20');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch actions');
      }

      const data = await response.json();
      setActions(data.actions || []);
      setError(null);
    } catch (err) {
      console.error('Error loading actions:', err);
      setError(err instanceof Error ? err.message : 'Error loading actions');
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'generate':
        return <Zap className="w-4 h-4 text-purple-500" />;
      case 'deploy':
        return <Upload className="w-4 h-4 text-green-500" />;
      case 'rollback':
        return <RotateCcw className="w-4 h-4 text-orange-500" />;
      case 'create':
        return <Plus className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'edit':
        return <Edit className="w-4 h-4 text-gray-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action) => {
    const labels= {
      generate: 'Generated with AI',
      deploy: 'Deployed',
      rollback: 'Rolled back',
      create: 'Created',
      delete: 'Deleted',
      edit: 'Edited',
      commit: 'Committed',
    };
    return labels[action] || action;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      <button
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) fetchActions();
        }}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-gray-900">Activity Log</span>
          {actions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
              {actions.length}
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
              <Loader className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No actions yet</p>
              <p className="text-sm">Your activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActionIcon(action.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {getActionLabel(action.action)}
                      </p>
                      {action.file_path && (
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          📄 {action.file_path}
                        </p>
                      )}
                      {action.description && (
                        <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        {formatTime(action.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
