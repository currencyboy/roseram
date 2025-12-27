'use client';

import React, { useEffect, useState } from 'react';
import { useIntegrations } from '@/lib/integrations-context';
import { useAuth } from './AuthProvider';
import { Github, Database, CheckCircle, AlertCircle, Globe, User } from 'lucide-react';

export function IntegrationStatusBar({ onOpenSettings, onOpenAuthModal }) {
  const { github, supabase } = useIntegrations();
  const { session } = useAuth();
  const [envVars, setEnvVars] = useState({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEnvVars({
        hasXApiKey: !!process.env.NEXT_PUBLIC_X_API_KEY,
        hasStripeKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      });
    }
  }, []);

  const isGithubConnected = !!github.token && !!github.repository;
  const isSupabaseConnected = !!supabase.schema;
  const isNetlifyConnected = !!process.env.NEXT_PUBLIC_NETLIFY_ACCESS_TOKEN;

  return (
    <div className="w-full bg-gray-100 border-b border-gray-300 p-0 h-16">
      <div className="grid grid-cols-4 gap-0 h-full">
        {/* GitHub */}
        <div className="bg-white border-r border-gray-300 p-2 transition-all hover:bg-blue-50 cursor-pointer flex flex-col justify-center h-full" onClick={onOpenSettings}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Github className="w-3 h-3 text-gray-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">GitHub</p>
                {isGithubConnected ? (
                  <p className="text-xs text-gray-600 truncate">
                    <span className="font-mono text-blue-600">{github.repository?.owner}/{github.repository?.name}</span>
                  </p>
                ) : (
                  <p className="text-xs text-red-600">Not connected</p>
                )}
              </div>
            </div>
            {isGithubConnected ? (
              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Supabase */}
        <div className="bg-white border-r border-gray-300 p-2 transition-all hover:bg-blue-50 cursor-pointer flex flex-col justify-center h-full" onClick={onOpenSettings}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Database className="w-3 h-3 text-gray-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">Supabase</p>
                {isSupabaseConnected ? (
                  <p className="text-xs text-gray-600">{Object.keys(supabase.schema || {}).length} tables</p>
                ) : (
                  <p className="text-xs text-red-600">Not connected</p>
                )}
              </div>
            </div>
            {isSupabaseConnected ? (
              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Netlify */}
        <div className="bg-white border-r border-gray-300 p-2 transition-all hover:bg-blue-50 cursor-pointer flex flex-col justify-center h-full" onClick={onOpenSettings}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Globe className="w-3 h-3 text-gray-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">Netlify</p>
                {isNetlifyConnected ? (
                  <p className="text-xs text-gray-600">Connected</p>
                ) : (
                  <p className="text-xs text-red-600">Not connected</p>
                )}
              </div>
            </div>
            {isNetlifyConnected ? (
              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* User Session */}
        <button
          onClick={onOpenAuthModal}
          className={`bg-white border-0 p-2 transition-all flex flex-col justify-center h-full cursor-pointer w-full text-left ${
            session ? 'hover:bg-green-50' : 'hover:bg-orange-50'
          }`}
          type="button"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User className="w-3 h-3 text-gray-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">Session</p>
                {session?.user?.email ? (
                  <p className="text-xs text-green-700 font-medium truncate">
                    {session.user.email.length > 20
                      ? session.user.email.substring(0, 17) + '...'
                      : session.user.email}
                  </p>
                ) : (
                  <p className="text-xs text-orange-600 font-medium">Not signed in</p>
                )}
              </div>
            </div>
            {session?.user ? (
              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
