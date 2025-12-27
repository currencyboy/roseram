'use client';

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Loader,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Save,
  Plus,
  X,
  Code2,
  Package,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useIntegrations } from '@/lib/integrations-context';

export function SessionManagementPanel({ onSessionClear, isOpen = true }) {
  const { session } = useAuth();
  const { github } = useIntegrations();
  const [xApiKey, setXApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [newDep, setNewDep] = useState({ name: '', version: '^1.0.0' });

  useEffect(() => {
    if (session?.user?.id) {
      loadSessionKey();
    }
  }, [session?.user?.id]);

  const loadSessionKey = async () => {
    try {
      const response = await fetch('/api/session-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get',
          sessionId: session?.user?.id,
        }),
      });

      const data = await response.json();
      if (data.apiKey) {
        setXApiKey(data.apiKey);
        setApiKeySaved(true);
      }
    } catch (err) {
      console.error('Failed to load session key:', err);
    }
  };

  const handleSaveApiKey = async () => {
    if (!xApiKey.trim()) {
      setError('API key cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/session-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set',
          sessionId: session?.user?.id,
          userXApiKey: xApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save API key');
      }

      setApiKeySaved(true);
      setError(null);
      setTimeout(() => setApiKeySaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!window.confirm('Clear X.AI API key from this session?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/session-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          sessionId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear API key');
      }

      setXApiKey('');
      setApiKeySaved(false);
    } catch (err) {
      setError(err.message || 'Failed to clear API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = async () => {
    const confirmed = window.confirm(
      'Clear all session data? This will:\n' +
      '- Clear conversation history\n' +
      '- Reset repository connection\n' +
      '- Clear API keys\n' +
      '- Reset all preferences\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      // Clear localStorage
      localStorage.clear();

      // Clear session from Supabase (if needed)
      if (session?.user?.id) {
        await fetch('/api/session-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'clear',
            sessionId: session?.user?.id,
          }),
        });
      }

      // Reset UI state
      setXApiKey('');
      setApiKeySaved(false);
      setDependencies([]);
      setFrameworks([]);

      // Trigger callback
      if (onSessionClear) {
        onSessionClear();
      }

      // Optionally reload page
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to clear session');
    } finally {
      setLoading(false);
    }
  };

  const addDependency = () => {
    if (!newDep.name.trim()) return;

    setDependencies([...dependencies, newDep]);
    setNewDep({ name: '', version: '^1.0.0' });
    setShowDependencyModal(false);
  };

  const removeDependency = (index) => {
    setDependencies(dependencies.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
      {/* Session Info */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          Session Management
        </h3>

        {/* User Info */}
        {session?.user && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
            <p className="text-gray-700">
              <span className="font-medium">Session ID:</span> {session.user.id?.slice(0, 8)}...
            </p>
            <p className="text-gray-700">
              <span className="font-medium">User:</span> {session.user.email}
            </p>
          </div>
        )}

        {/* Repository Info */}
        {github.repository && (
          <div className="bg-green-50 border border-green-200 rounded p-2 text-xs">
            <p className="text-gray-700">
              <span className="font-medium">Repository:</span> {github.repository.owner}/{github.repository.name}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}


      {/* Dependencies Info */}
      {dependencies.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Project Dependencies
          </h4>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {dependencies.map((dep, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                <span className="font-mono text-gray-700">
                  {dep.name}@{dep.version}
                </span>
                <button
                  onClick={() => removeDependency(i)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowDependencyModal(true)}
            className="w-full px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Dependency
          </button>
        </div>
      )}

      {/* Frameworks */}
      {frameworks.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700">Detected Frameworks</h4>
          <div className="flex flex-wrap gap-1">
            {frameworks.map((fw, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
              >
                {fw}
              </span>
            ))}
          </div>
        </div>
      )}


      {/* Add Dependency Modal */}
      {showDependencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-gray-900 mb-3">Add Dependency</h3>

            <div className="space-y-3">
              <input
                type="text"
                value={newDep.name}
                onChange={(e) => setNewDep({ ...newDep, name: e.target.value })}
                placeholder="Package name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />

              <input
                type="text"
                value={newDep.version}
                onChange={(e) => setNewDep({ ...newDep, version: e.target.value })}
                placeholder="Version"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDependencyModal(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addDependency}
                  disabled={!newDep.name.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
