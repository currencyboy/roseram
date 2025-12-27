'use client';

import React, { useEffect, useState } from 'react';
import { useIntegrations } from '@/lib/integrations-context';
import { useAuth } from './AuthProvider';
import {
  Github,
  Database,
  User,
  CheckCircle2,
  AlertCircle,
  Settings,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

export function IntegrationStatus({ onOpenSettings }) {
  const { github, supabase } = useIntegrations();
  const { session, loading } = useAuth();
  const [expandedSection, setExpandedSection] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [envVars, setEnvVars] = useState({
    hasGithubEnv: false,
    hasSupabaseUrl: false,
    hasSupabaseKey: false,
    hasStripeKey: false,
    hasXApiKey: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const detected = {
        hasGithubEnv: !!process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasStripeKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        hasXApiKey: !!process.env.NEXT_PUBLIC_X_API_KEY,
      };
      setEnvVars(detected);
    }
  }, [isMounted]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderStatusBadge = (isConnected, source = 'manual') => {
    if (!isConnected) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
          <AlertCircle className="w-3 h-3" />
          Not connected
        </span>
      );
    }

    if (source === 'env') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
          <CheckCircle2 className="w-3 h-3" />
          From Environment
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </span>
    );
  };

  return (
    <div className="w-full bg-white border-b-2 border-blue-500 shadow-sm">
      <div className="px-6 py-4 space-y-3">
        {/* Repository Status */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('repository')}
            className="w-full flex items-center justify-between hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-gray-700" />
                <span className="font-semibold text-gray-900">Preview Repository</span>
              </div>
              {github.repository ? (
                <span className="text-xs font-mono text-white bg-green-600 px-2 py-1 rounded">
                  {github.repository.owner}/{github.repository.name}
                </span>
              ) : (
                <span className="text-xs font-mono text-gray-600 bg-gray-200 px-2 py-1 rounded">
                  Not configured
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSection === 'repository' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'repository' && (
            <div className="ml-8 space-y-3 py-2 border-l border-gray-300 pl-4">
              {github.repository ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Preview Status</span>
                    {github.token ? (
                      renderStatusBadge(true, 'manual')
                    ) : (
                      renderStatusBadge(false)
                    )}
                  </div>
                  <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <p className="font-semibold text-gray-900 mb-1">Repository Details:</p>
                    <p><strong>Owner:</strong> <span className="font-mono text-gray-900">{github.repository.owner}</span></p>
                    <p><strong>Repository:</strong> <span className="font-mono text-gray-900">{github.repository.name}</span></p>
                    <p><strong>Default Branch:</strong> <span className="font-mono text-gray-900">{github.repository.defaultBranch || 'main'}</span></p>
                    {github.repository.isFork && (
                      <p><strong>Type:</strong> <span className="text-blue-600">Forked Repository</span></p>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                    <p className="font-semibold text-blue-900 mb-1">Preview Access:</p>
                    <p>✓ Repository is connected and authenticated</p>
                    <p>✓ Ready to start live preview</p>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="font-semibold text-yellow-900 mb-1">No Repository Selected</p>
                  <p className="mb-2">Click "Configure Repository" below to select a repository for live preview.</p>
                </div>
              )}
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-2 rounded"
              >
                <Settings className="w-3 h-3" />
                {github.repository ? 'Change Repository' : 'Select Repository'}
              </button>
            </div>
          )}
        </div>

        {/* GitHub Integration */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('github')}
            className="w-full flex items-center justify-between hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-900">GitHub Authentication</span>
            </div>
            {github.token ? (
              renderStatusBadge(true)
            ) : (
              renderStatusBadge(false)
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSection === 'github' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'github' && (
            <div className="ml-8 space-y-2 py-2 border-l border-gray-300 pl-4">
              <p className="text-xs text-gray-600">Used to authenticate with GitHub and access your repositories (including forked repositories)</p>
              {github.token ? (
                <>
                  <div className="text-xs bg-green-50 text-green-800 p-2 rounded border border-green-200">
                    <p className="font-semibold mb-1">✓ Authentication Enabled</p>
                    <p>Token: <span className="font-mono text-xs">{github.token.substring(0, 10)}...{github.token.substring(github.token.length - 5)}</span></p>
                    <p className="text-xs mt-1">Your personal access token is securely stored and used for:</p>
                    <ul className="text-xs list-disc list-inside mt-1 space-y-0.5">
                      <li>Listing your repositories</li>
                      <li>Cloning private and forked repositories</li>
                      <li>Pushing code changes to main branch</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200">
                  <p className="font-semibold text-yellow-900 mb-1">⚠ Authentication Required</p>
                  <p>No GitHub token configured. You need to add your personal access token to access private repositories.</p>
                </div>
              )}
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-2 rounded"
              >
                <Settings className="w-3 h-3" />
                {github.token ? 'Update Token' : 'Add GitHub Token'}
              </button>
            </div>
          )}
        </div>

        {/* Supabase Integration */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('supabase')}
            className="w-full flex items-center justify-between hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-900">Supabase</span>
            </div>
            {supabase.schema ? (
              renderStatusBadge(true)
            ) : envVars.hasSupabaseUrl && envVars.hasSupabaseKey ? (
              renderStatusBadge(true, 'env')
            ) : (
              renderStatusBadge(false)
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSection === 'supabase' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSection === 'supabase' && (
            <div className="ml-8 space-y-2 py-2 border-l border-gray-300 pl-4">
              <p className="text-xs text-gray-600">Database and authentication backend</p>
              {supabase.schema && (
                <div className="text-xs text-gray-600">
                  <p>URL: <span className="font-mono text-gray-900">{supabase.url ? supabase.url.substring(0, 30) + '...' : 'Not set'}</span></p>
                  <p>Tables detected: <span className="font-mono text-gray-900">{Object.keys(supabase.schema).length}</span></p>
                </div>
              )}
              {envVars.hasSupabaseUrl && !supabase.schema && (
                <p className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  Environment variables detected but schema not loaded
                </p>
              )}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Settings className="w-3 h-3" />
                {supabase.schema ? 'Update Schema' : 'Configure Supabase'}
              </button>
            </div>
          )}
        </div>

        {/* Other Integrations */}
        {isMounted && (envVars.hasStripeKey || envVars.hasXApiKey || (!loading && session)) && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('other')}
              className="w-full flex items-center justify-between hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">Other Services</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  expandedSection === 'other' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSection === 'other' && (
              <div className="ml-8 space-y-2 py-2 border-l border-gray-300 pl-4">
                {!loading && session && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-700" />
                      <span className="text-sm text-gray-700">User Session</span>
                    </div>
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {session.user?.email || 'Authenticated'}
                    </span>
                  </div>
                )}
                {!loading && !session && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-700" />
                      <span className="text-sm text-gray-700">User Session</span>
                    </div>
                    {renderStatusBadge(false)}
                  </div>
                )}
                {envVars.hasXApiKey && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Grok AI (X.AI)</span>
                    {renderStatusBadge(true, 'env')}
                  </div>
                )}
                {envVars.hasStripeKey && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Stripe Payments</span>
                    {renderStatusBadge(true, 'env')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Configuration Actions */}
        <div className="pt-2 border-t border-gray-200 mt-3">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Settings className="w-4 h-4" />
            Add or Update Integrations
          </button>
        </div>
      </div>
    </div>
  );
}
