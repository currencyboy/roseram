'use client';

import { useState } from 'react';

const INTEGRATIONS = [
  {
    id: 'supabase',
    name: 'Supabase',
    icon: '🔐',
    description: 'Database & Auth',
    configured: false,
    envVars: [
      { key: 'SUPABASE_PROJECT_URL', label: 'Project URL' },
      { key: 'SUPABASE_ANON', label: 'Anon Key' },
      { key: 'SUPABASE_SERVICE_ROLE', label: 'Service Role Key' },
    ],
  },
  {
    id: 'netlify',
    name: 'Netlify',
    icon: 'deploy',
    description: 'Hosting & Deployment',
    configured: false,
    envVars: [
      { key: 'NEXT_NETLIFY_ACCESS_TOKEN', label: 'Access Token' },
      { key: 'NEXT_NETLIFY_SITE_ID', label: 'Site ID' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'Repository Management',
    configured: false,
    envVars: [{ key: 'GITHUB_ACCESS_TOKEN', label: 'Personal Access Token' }],
  },
];

export function MCPIntegrations() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [expandedId, setExpandedId] = useState(null);
  const [envValues, setEnvValues] = useState({});

  const handleSaveIntegration = (id) => {
    setIntegrations(
      integrations.map((int) =>
        int.id === id ? { ...int, configured: true } : int
      )
    );
    setExpandedId(null);
  };

  const getIntegration = (id) => integrations.find((i) => i.id === id);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">MCP Integrations</h2>
      <p className="text-sm text-gray-400">
        Connect your enterprise tools for seamless development
      </p>

      <div className="grid gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
          >
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-sm text-gray-400">{integration.description}</p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  integration.configured
                    ? 'bg-green-900 text-green-200'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {integration.configured ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            {expandedId === integration.id && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="space-y-3">
                  {integration.envVars.map((envVar) => (
                    <div key={envVar.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {envVar.label}
                      </label>
                      <input
                        type="password"
                        placeholder={`Enter ${envVar.label}`}
                        value={envValues[envVar.key] || ''}
                        onChange={(e) =>
                          setEnvValues({
                            ...envValues,
                            [envVar.key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSaveIntegration(integration.id)}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Integration
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
