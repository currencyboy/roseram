'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';

export function ConfigurationWizard({ isOpen, onClose, config, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [validationResults, setValidationResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [selectedIntegrations, setSelectedIntegrations] = useState(new Set());

  // Resource lists
  const [githubRepos, setGithubRepos] = useState([]);
  const [supabaseProjects, setSupabaseProjects] = useState([]);
  const [netlifySites, setNetlifySites] = useState([]);

  // Selected resources
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);

  const steps = [
    {
      id: 'review',
      title: 'Review Imported Configuration',
      description: 'Review the environment variables that were detected',
    },
    {
      id: 'detect',
      title: 'Detect Available Integrations',
      description: 'Validate which services can be configured',
    },
    {
      id: 'configure',
      title: 'Configure Each Integration',
      description: 'Select resources and test connections',
    },
    {
      id: 'sync',
      title: 'Sync with Builder',
      description: 'Apply configurations to your builder environment',
    },
  ];

  const integrations = [
    {
      id: 'github',
      name: 'GitHub',
      key: 'github_token',
      description: 'Connect to your GitHub repositories',
      envVars: ['github_token', 'GITHUB_ACCESS_TOKEN'],
    },
    {
      id: 'supabase',
      name: 'Supabase',
      key: 'supabase_url',
      description: 'Access your Supabase database',
      envVars: ['supabase_url', 'supabase_anon_key'],
    },
    {
      id: 'netlify',
      name: 'Netlify',
      key: 'netlify_token',
      description: 'Deploy to Netlify',
      envVars: ['netlify_token'],
    },
  ];

  const detectAvailableIntegrations = () => {
    const available = integrations.filter(integration => {
      const hasKey = config[integration.key];
      return hasKey && hasKey.trim() !== '';
    });
    setSelectedIntegrations(new Set(available.map(i => i.id)));
  };

  const validateIntegration = async (integrationId) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return false;

    setIsValidating(true);
    try {
      const response = await fetch('/api/integrations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: integration.id,
          credentials: {
            token: config[integration.key],
            url: config.supabase_url,
            key: config.supabase_anon_key,
          },
        }),
      });

      const result = await response.json();
      setValidationResults(prev => ({
        ...prev,
        [integrationId]: {
          valid: result.valid,
          message: result.message,
          timestamp: Date.now(),
        },
      }));

      return result.valid;
    } catch (error) {
      console.error(`Failed to validate ${integrationId}:`, error);
      setValidationResults(prev => ({
        ...prev,
        [integrationId]: {
          valid: false,
          message: 'Validation failed - check your credentials',
          timestamp: Date.now(),
        },
      }));
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const validateAllIntegrations = async () => {
    setIsValidating(true);
    const results = {};

    for (const integrationId of selectedIntegrations) {
      const integration = integrations.find(i => i.id === integrationId);
      try {
        const response = await fetch('/api/integrations/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: integration.id,
            credentials: {
              token: config[integration.key],
              url: config.supabase_url,
              key: config.supabase_anon_key,
            },
          }),
        });

        const result = await response.json();
        results[integrationId] = {
          valid: result.valid,
          message: result.message,
          timestamp: Date.now(),
        };
      } catch (error) {
        results[integrationId] = {
          valid: false,
          message: 'Validation failed',
          timestamp: Date.now(),
        };
      }
    }

    setValidationResults(results);
    setIsValidating(false);
    setCompletedSteps(prev => new Set([...prev, 'detect']));

    // Auto-advance to configuration step
    setCurrentStep(2);
  };

  const fetchGithubRepos = async () => {
    if (!config.github_token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/repositories?action=list', {
        headers: {
          'X-GitHub-Token': config.github_token,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setGithubRepos(data.repositories || []);
      } else {
        console.error('Failed to fetch GitHub repos:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch GitHub repos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupabaseProjects = async () => {
    if (!config.supabase_url) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${config.supabase_url}/rest/v1/`, {
        headers: {
          apikey: config.supabase_anon_key,
          Authorization: `Bearer ${config.supabase_anon_key}`,
        },
      });
      if (response.ok || response.status === 401) {
        const projectId = new URL(config.supabase_url).hostname.split('.')[0];
        setSupabaseProjects([{
          id: projectId,
          name: projectId,
          url: config.supabase_url,
        }]);
      }
    } catch (error) {
      console.error('Failed to fetch Supabase projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNetlifySites = async () => {
    if (!config.netlify_token) return;
    setIsLoading(true);
    try {
      const response = await fetch('https://api.netlify.com/api/v1/sites', {
        headers: {
          Authorization: `Bearer ${config.netlify_token}`,
        },
      });
      if (response.ok) {
        const sites = await response.json();
        setNetlifySites(sites.map(s => ({
          id: s.id,
          name: s.name,
          domain: s.default_domain,
          siteId: s.id,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch Netlify sites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepChange = (stepIndex) => {
    if (stepIndex === 1 && !completedSteps.has('review')) {
      return;
    }
    setCurrentStep(stepIndex);
  };

  const handleLoadResources = async () => {
    if (selectedIntegrations.has('github')) {
      await fetchGithubRepos();
    }
    if (selectedIntegrations.has('supabase')) {
      await fetchSupabaseProjects();
    }
    if (selectedIntegrations.has('netlify')) {
      await fetchNetlifySites();
    }
  };

  const handleCompleteSetup = () => {
    const configuredIntegrations = Array.from(selectedIntegrations).reduce((acc, id) => {
      const integration = integrations.find(i => i.id === id);
      const validation = validationResults[id];

      acc[id] = {
        configured: validation?.valid || false,
        credentials: {
          token: integration.key === 'github_token' ? config[integration.key] : undefined,
          url: integration.id === 'supabase' ? config.supabase_url : undefined,
          key: integration.id === 'supabase' ? config.supabase_anon_key : undefined,
        },
        selected: {
          repo: id === 'github' ? selectedRepo : undefined,
          project: id === 'supabase' ? selectedProject : undefined,
          site: id === 'netlify' ? selectedSite : undefined,
        },
      };
      return acc;
    }, {});

    onComplete(configuredIntegrations);
  };

  useEffect(() => {
    if (currentStep === 1 && !completedSteps.has('detect')) {
      detectAvailableIntegrations();
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 2) {
      handleLoadResources();
    }
  }, [currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-black px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Configuration Wizard</h1>
            <p className="text-gray-400 text-sm">Step {currentStep + 1} of {steps.length}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => handleStepChange(idx)}
                disabled={idx > 0 && !completedSteps.has(steps[idx - 1].id) && idx !== 1}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentStep === idx
                    ? 'bg-black text-white'
                    : completedSteps.has(step.id)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {completedSteps.has(step.id) ? (
                  <span>Done</span>
                ) : (
                  <span>{idx + 1}</span>
                )}
                <span className="hidden sm:inline text-xs">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {/* Step 1: Review */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{steps[0].title}</h2>
                <p className="text-sm text-gray-600 mb-4">{steps[0].description}</p>
              </div>

              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-800 mb-3">Detected Environment Variables</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(config).map(([key, value]) => (
                    value && (
                      <div key={key} className="flex items-start justify-between gap-2 p-2 bg-white rounded border border-gray-200">
                        <span className="text-xs font-mono text-gray-700 font-semibold">{key}</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 truncate max-w-xs">
                          {value.substring(0, 20)}{value.length > 20 ? '...' : ''}
                        </code>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setCompletedSteps(prev => new Set([...prev, 'review']));
                  setCurrentStep(1);
                }}
                className="w-full mt-4 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
              >
                Review Complete
              </button>
            </div>
          )}

          {/* Step 2: Detect Integrations */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{steps[1].title}</h2>
                <p className="text-sm text-gray-600 mb-4">{steps[1].description}</p>
              </div>

              <div className="space-y-3">
                {integrations.map(integration => {
                  const isDetected = selectedIntegrations.has(integration.id);
                  return (
                    <div
                      key={integration.id}
                      className={`p-4 border rounded-lg transition-all ${
                        isDetected
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 opacity-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{integration.name}</p>
                          <p className="text-sm text-gray-600">{integration.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Key: <code className="bg-gray-100 px-1 rounded">{integration.key}</code>
                          </p>
                        </div>
                        <div className="text-right">
                          {isDetected ? (
                            <div className="text-xs font-medium text-green-600">
                              Detected
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-gray-400">
                              Not Found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={validateAllIntegrations}
                disabled={isValidating}
                className="w-full mt-4 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors font-medium"
              >
                {isValidating ? 'Validating Integrations...' : 'Validate All Connections'}
              </button>
            </div>
          )}

          {/* Step 3: Configure */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{steps[2].title}</h2>
                <p className="text-sm text-gray-600 mb-4">{steps[2].description}</p>
              </div>

              <div className="space-y-4">
                {Array.from(selectedIntegrations).map(integrationId => {
                  const integration = integrations.find(i => i.id === integrationId);
                  const validation = validationResults[integrationId];

                  return (
                    <div key={integrationId} className="p-4 border border-gray-200 rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{integration.name}</p>
                          <p className="text-xs text-gray-600">{integration.description}</p>
                        </div>
                        {validation && (
                          <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            validation.valid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {validation.valid ? 'Connected' : 'Failed'}
                          </div>
                        )}
                      </div>

                      {validation && (
                        <div className={`p-2 rounded text-xs ${
                          validation.valid
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {validation.message}
                        </div>
                      )}

                      {/* GitHub Repo Selection */}
                      {integrationId === 'github' && githubRepos.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700">Select Repository</label>
                          <select
                            value={selectedRepo?.id || ''}
                            onChange={(e) => {
                              const repo = githubRepos.find(r => r.id === parseInt(e.target.value));
                              setSelectedRepo(repo);
                            }}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            <option value="">Choose a repository...</option>
                            {githubRepos.map(repo => (
                              <option key={repo.id} value={repo.id}>
                                {repo.fullName}
                              </option>
                            ))}
                          </select>
                          {selectedRepo && (
                            <p className="text-xs text-gray-600">
                              Branch: {selectedRepo.defaultBranch}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Supabase Project Selection */}
                      {integrationId === 'supabase' && supabaseProjects.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700">Select Project</label>
                          <select
                            value={selectedProject?.id || ''}
                            onChange={(e) => {
                              const project = supabaseProjects.find(p => p.id === e.target.value);
                              setSelectedProject(project);
                            }}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            <option value="">Choose a project...</option>
                            {supabaseProjects.map(project => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                          {selectedProject && (
                            <p className="text-xs text-gray-600">
                              URL: {selectedProject.url}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Netlify Site Selection */}
                      {integrationId === 'netlify' && netlifySites.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700">Select Site</label>
                          <select
                            value={selectedSite?.id || ''}
                            onChange={(e) => {
                              const site = netlifySites.find(s => s.id === e.target.value);
                              setSelectedSite(site);
                            }}
                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            <option value="">Choose a site...</option>
                            {netlifySites.map(site => (
                              <option key={site.id} value={site.id}>
                                {site.name} ({site.domain})
                              </option>
                            ))}
                          </select>
                          {selectedSite && (
                            <p className="text-xs text-gray-600">
                              Domain: {selectedSite.domain}
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => validateIntegration(integrationId)}
                        disabled={isValidating}
                        className="text-xs px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded transition-colors"
                      >
                        {isValidating ? 'Testing...' : 'Retest Connection'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 justify-center py-4">
                  <Loader className="w-4 h-4 animate-spin" />
                  <p className="text-sm text-gray-600">Loading resources...</p>
                </div>
              )}

              <button
                onClick={() => {
                  setCompletedSteps(prev => new Set([...prev, 'configure']));
                  setCurrentStep(3);
                }}
                className="w-full mt-4 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
              >
                Configuration Complete
              </button>
            </div>
          )}

          {/* Step 4: Sync */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{steps[3].title}</h2>
                <p className="text-sm text-gray-600 mb-4">{steps[3].description}</p>
              </div>

              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <div className="flex gap-3">
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">Syncing Configurations</p>
                    <p className="text-sm text-gray-700">Applying your integrations and resource selections to the Builder environment...</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Configuration Summary</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  {Array.from(selectedIntegrations).map(integrationId => {
                    const validation = validationResults[integrationId];
                    const integration = integrations.find(i => i.id === integrationId);
                    let selectedResource = '';

                    if (integrationId === 'github' && selectedRepo) {
                      selectedResource = ` • ${selectedRepo.fullName}`;
                    } else if (integrationId === 'supabase' && selectedProject) {
                      selectedResource = ` • ${selectedProject.name}`;
                    } else if (integrationId === 'netlify' && selectedSite) {
                      selectedResource = ` • ${selectedSite.name}`;
                    }

                    return (
                      <div key={integrationId} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{integration.name}</span>
                            {selectedResource && (
                              <p className="text-xs text-gray-500">{selectedResource}</p>
                            )}
                          </div>
                        </div>
                        {validation?.valid ? (
                          <div className="text-green-600 text-xs font-medium">
                            Ready
                          </div>
                        ) : (
                          <div className="text-red-600 text-xs font-medium">
                            Pending
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCompleteSetup}
                className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Complete Setup & Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Previous
          </button>
          <p className="text-sm text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
