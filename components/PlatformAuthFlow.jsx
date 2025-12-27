'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, LogOut } from 'lucide-react';

export function PlatformAuthFlow({
  platform,
  platformName,
  isConnected,
  onConnect,
  onDisconnect,
  connectionStatus,
  email,
  children,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await onDisconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`p-4 rounded-lg border transition-all ${
        isConnected
          ? 'bg-green-50 border-green-300'
          : 'bg-blue-50 border-blue-300'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {platformName}
              </p>
              {isConnected && email ? (
                <p className="text-sm text-gray-600 mt-1">
                  Logged in as: <span className="font-mono font-semibold">{email}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  {connectionStatus || 'Not connected'}
                </p>
              )}
            </div>
          </div>
          
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : null}
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Children - Additional Options/Dropdowns */}
      {isConnected && children && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}
