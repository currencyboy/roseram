'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Github, Database, Globe, AlertCircle, CheckCircle, Copy, Loader, Unlink, GitBranch } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthProvider';
import { useIntegrations } from '@/lib/integrations-context';
import { useBranchSync } from '@/lib/branch-sync-context';
import { useProject } from '@/lib/project-context';
import { PlatformAuthFlow } from './PlatformAuthFlow';
import { ResourceSelector } from './ResourceSelector';
import { ConfigurationWizard } from './ConfigurationWizard';
import { EnvVariableImporter } from './EnvVariableImporter';

export function EnhancedIntegrationModal({ isOpen, onClose }) {
  const { session } = useAuth();
  const { github, supabase } = useIntegrations();
  const { createBranch, switchBranch } = useBranchSync();
  const { createProject } = useProject();
  const [activeTab, setActiveTab] = useState('github');
  const [envVars, setEnvVars] = useState({});
  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [importedConfig, setImportedConfig] = useState(null);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isBranchCreating, setIsBranchCreating] = useState(false);

  // GitHub State
  const [githubToken, setGithubToken] = useState('');
  const [githubUser, setGithubUser] = useState(null);
  const [githubRepos, setGithubRepos] = useState([]);
  const [selectedGithubRepo, setSelectedGithubRepo] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [repoBranches, setRepoBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchSelectionMessage, setBranchSelectionMessage] = useState(null);
  const [isCreatingNewBranch, setIsCreatingNewBranch] = useState(false);

  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseProject, setSupabaseProject] = useState(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState(null);

  // Netlify State
  const [netlifyToken, setNetlifyToken] = useState('');
  const [netlifyUser, setNetlifyUser] = useState(null);
  const [netlifySites, setNetlifySites] = useState([]);
  const [selectedNetlifySite, setSelectedNetlifySite] = useState(null);
  const [netlifyLoading, setNetlifyLoading] = useState(false);
  const [netlifyError, setNetlifyError] = useState(null);

  // Save integration credentials to user_env_vars
  const saveCredentialsToDb = useCallback(async (provider, metadata) => {
    if (!session?.user) {
      console.info('User not authenticated. Credentials saved locally only.');
      return true;
    }

    try {
      const response = await fetch('/api/integrations/save-env-vars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token || ''}`,
        },
        body: JSON.stringify({ provider, metadata }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error(`Failed to save ${provider} credentials:`, data.error);
        return false;
      }

      console.log(`${provider} credentials saved to database`);
      return true;
    } catch (err) {
      console.error('Error saving credentials:', err);
      return false;
    }
  }, [session?.user, session?.access_token]);

  // Load all integrations from environment variables and database
  const handleLoadAll = useCallback(async () => {
    setIsLoadingAll(true);
    try {
      if (!session) {
        console.info('User is not signed in. Loading environment variable integrations only.');
      }

      const response = await fetch('/api/integrations/load-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to load integrations: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load integrations');
      }

      let loadedCount = 0;

      // Load GitHub credentials into input fields
      if (data.github?.token) {
        setGithubToken(data.github.token);
        console.log('GitHub token loaded into input field');
        loadedCount++;
      }

      // Load Supabase credentials into input fields
      if (data.supabase?.key) {
        setSupabaseKey(data.supabase.key);
        console.log('Supabase key loaded into input field');

        // Also populate the URL from metadata if available
        if (data.supabase.url) {
          setSupabaseUrl(data.supabase.url);
          console.log('Supabase URL loaded into input field:', data.supabase.url);
        }

        loadedCount++;
      }

      // Load Netlify credentials into input fields
      if (data.netlify?.token) {
        setNetlifyToken(data.netlify.token);
        console.log('Netlify token loaded into input field');
        loadedCount++;
      }

      if (loadedCount === 0) {
        console.info('No integrations found. Sign in to load your saved integrations.');
      } else {
        console.info(`Successfully loaded ${loadedCount} integration(s) into input fields`);
      }
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setIsLoadingAll(false);
    }
  }, [session]);

  // Disconnect all integrations
  const handleDisconnectAll = useCallback(() => {
    if (window.confirm('Are you sure you want to disconnect all integrations?')) {
      setGithubToken('');
      setGithubUser(null);
      setGithubRepos([]);
      setSelectedGithubRepo(null);
      github.setToken(null);

      setSupabaseUrl('');
      setSupabaseKey('');
      setSupabaseProject(null);
      supabase.setCredentials(null, null);

      setNetlifyToken('');
      setNetlifyUser(null);
      setNetlifySites([]);
      setSelectedNetlifySite(null);

      setEnvVars({});

      // Close modal and return to main layout
      setTimeout(() => onClose(), 300);
    }
  }, [github, supabase, onClose]);

  // GitHub: Connect and fetch repos
  const handleGithubConnect = useCallback(async () => {
    if (!githubToken) {
      setGithubError('Please enter a GitHub token');
      return;
    }

    // Validate token format
    if (!githubToken.startsWith('ghp_') && !githubToken.startsWith('github_pat_')) {
      setGithubError('Invalid token format. GitHub tokens should start with "ghp_" or "github_pat_"');
      return;
    }

    setGithubLoading(true);
    setGithubError(null);

    try {
      // Validate token
      const validateRes = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate-token', token: githubToken }),
      });

      const validateData = await validateRes.json();
      if (!validateData.valid) {
        throw new Error(validateData.error || 'Invalid token');
      }

      setGithubUser(validateData.user);
      github.setToken(githubToken);

      // Save credentials to database if user is authenticated
      if (session?.user) {
        await saveCredentialsToDb('github', { token: githubToken });
      }

      // Fetch repositories
      const reposRes = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-repos', token: githubToken }),
      });

      const reposData = await reposRes.json();
      if (reposData.success) {
        setGithubRepos(reposData.repositories);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      setGithubError(errorMsg);
      console.error('[EnhancedIntegrationModal] GitHub connection error:', errorMsg);
    } finally {
      setGithubLoading(false);
    }
  }, [githubToken, github, session?.user, saveCredentialsToDb]);

  const handleGithubDisconnect = useCallback(() => {
    setGithubToken('');
    setGithubUser(null);
    setGithubRepos([]);
    setSelectedGithubRepo(null);
    setRepoBranches([]);
    setShowBranchSelector(false);
    github.setToken(null);
  }, [github]);

  // Fetch available branches for a repository
  const handleFetchBranches = useCallback(async (repo) => {
    if (!repo || !githubToken) return;

    setBranchesLoading(true);
    try {
      const response = await fetch('/api/github/list-all-branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          token: githubToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRepoBranches(data.branches || []);
        setShowBranchSelector(true);
        console.log(`[EnhancedIntegrationModal] Fetched ${data.totalCount} branches (${data.roseramCount} roseram branches)`);
      } else {
        setGithubError(data.error || 'Failed to fetch branches');
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setGithubError('Failed to fetch branches');
    } finally {
      setBranchesLoading(false);
    }
  }, [githubToken]);

  const handleSelectBranch = useCallback(async (branch) => {
    if (!branch || !selectedGithubRepo || !githubToken) {
      return;
    }

    setSelectedBranch(branch.name);
    try {
      // Switch to the selected branch
      await switchBranch(
        selectedGithubRepo.owner,
        selectedGithubRepo.name,
        branch.name,
        githubToken
      );

      // Set the repository if not already set
      github.setRepository({
        owner: selectedGithubRepo.owner,
        name: selectedGithubRepo.name,
        id: selectedGithubRepo.id,
        defaultBranch: selectedGithubRepo.defaultBranch,
      });

      // Show confirmation message
      setBranchSelectionMessage(`✓ Selected branch: ${branch.name}`);
      console.log('[EnhancedIntegrationModal] Switched to branch:', branch.name);

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const msg = err?.message || 'Failed to switch branch';
      setGithubError(msg);
      setBranchSelectionMessage(null);
      setSelectedBranch(null);
      console.error('[EnhancedIntegrationModal] Switch branch error:', msg);
    }
  }, [selectedGithubRepo, githubToken, switchBranch, github, onClose]);


  const handleCreateNewBranch = useCallback(async () => {
    if (!selectedGithubRepo || !githubToken) {
      setGithubError('Repository and GitHub token are required');
      return;
    }

    setIsCreatingNewBranch(true);
    setBranchSelectionMessage(null);
    setGithubError(null);

    try {
      // Generate a unique branch name
      const branchId = uuidv4().substring(0, 8);
      const newBranchName = `roseram-${branchId}`;

      console.log(`[EnhancedIntegrationModal] Creating new branch: ${newBranchName}`);

      // Create the new branch
      const response = await fetch('/api/github/create-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: selectedGithubRepo.owner,
          repo: selectedGithubRepo.name,
          baseBranch: selectedGithubRepo.defaultBranch || 'main',
          token: githubToken,
          branchName: newBranchName,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create branch');
      }

      console.log('[EnhancedIntegrationModal] Branch created successfully:', newBranchName);

      // Refresh the branches list
      await handleFetchBranches(selectedGithubRepo);

      // Switch to the newly created branch
      setSelectedBranch(newBranchName);
      await switchBranch(
        selectedGithubRepo.owner,
        selectedGithubRepo.name,
        newBranchName,
        githubToken
      );

      // Set the repository
      github.setRepository({
        owner: selectedGithubRepo.owner,
        name: selectedGithubRepo.name,
        id: selectedGithubRepo.id,
        defaultBranch: selectedGithubRepo.defaultBranch,
      });

      // Show confirmation message
      setBranchSelectionMessage(`✓ Created and switched to: ${newBranchName}`);

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const msg = err?.message || 'Failed to create branch';
      setGithubError(msg);
      setBranchSelectionMessage(null);
      setSelectedBranch(null);
      console.error('[EnhancedIntegrationModal] Create branch error:', msg);
    } finally {
      setIsCreatingNewBranch(false);
    }
  }, [selectedGithubRepo, githubToken, switchBranch, github, onClose, handleFetchBranches]);

  const handleGithubRepoSelect = useCallback(async (repo) => {
    setSelectedGithubRepo(repo);
    setRepoBranches([]);
    setShowBranchSelector(false);
    setSelectedBranch(null);
    setBranchSelectionMessage(null);

    github.setRepository({
      owner: repo.owner,
      name: repo.name,
      id: repo.id,
      defaultBranch: repo.defaultBranch,
    });

    // Fetch available branches for this repository
    await handleFetchBranches(repo);

    // Create a working branch for this repository (or reuse existing)
    if (githubToken) {
      setIsBranchCreating(true);
      try {
        const branchInfo = await createBranch(
          repo.owner,
          repo.name,
          githubToken,
          repo.defaultBranch || 'main'
        );

        if (branchInfo.resumed) {
          console.log('[EnhancedIntegrationModal] Resumed existing working branch:', branchInfo.name);
        } else {
          console.log('[EnhancedIntegrationModal] Created new working branch:', branchInfo.name);
        }

        // Create a project if user is authenticated
        if (session?.user && session?.access_token) {
          const projectName = repo.name || `project-${Date.now()}`;
          const projectDescription = `Project for ${repo.owner}/${repo.name}`;

          console.log('[EnhancedIntegrationModal] Creating project:', projectName);
          const projectId = await createProject(
            projectName,
            projectDescription,
            session.access_token,
            {
              repository_url: `https://github.com/${repo.owner}/${repo.name}`,
              working_branch: branchInfo?.name || repo.defaultBranch || 'main',
            }
          );

          if (projectId) {
            console.log('[EnhancedIntegrationModal] Project created successfully:', projectId);
          } else {
            console.warn('[EnhancedIntegrationModal] Project creation returned no ID, but continuing');
          }
        } else {
          console.log('[EnhancedIntegrationModal] User not authenticated, skipping project creation');
        }
      } catch (error) {
        console.error('[EnhancedIntegrationModal] Failed to prepare working branch:', error);

        let errorMessage = error.message || 'Failed to prepare working branch';
        let errorTitle = 'Branch Creation Failed';

        // Check for permission-related errors
        if (
          errorMessage.includes('does not have permission') ||
          errorMessage.includes('Resource not accessible') ||
          errorMessage.includes('permission') ||
          errorMessage.includes('Access denied')
        ) {
          errorTitle = 'Insufficient Permissions';
          errorMessage = `Your GitHub token does not have permission to create branches.

Your token needs the "repo" scope (full control of private repositories).

How to fix:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" (Classic)
3. Check the "repo" checkbox
4. Copy the new token
5. Reconnect GitHub here with the new token

Current token scopes may be limited. A fresh token with full repo access is required.`;
        } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          errorTitle = 'Repository Not Found';
          errorMessage = 'Repository not found. Verify the repository name and that your token has access to it.';
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid token')) {
          errorTitle = 'Authentication Failed';
          errorMessage = 'Your GitHub token is invalid or expired. Please reconnect GitHub with a fresh token from https://github.com/settings/tokens';
        }

        setGithubError(`${errorTitle}: ${errorMessage}`);
      } finally {
        setIsBranchCreating(false);
      }
    }
  }, [github, githubToken, createBranch, handleFetchBranches, createProject, session]);

  // Import repository by GitHub URL (e.g., https://github.com/owner/repo)
  const handleImportByUrl = useCallback(async () => {
    if (!importUrl.trim()) {
      setGithubError('Please enter a GitHub repository URL');
      return;
    }

    if (!githubToken) {
      setGithubError('Please connect your GitHub account first');
      return;
    }

    setIsImportingUrl(true);
    setGithubError(null);

    try {
      // Parse the GitHub URL
      const urlPattern = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i;
      const match = importUrl.trim().match(urlPattern);

      if (!match) {
        throw new Error('Invalid GitHub URL format. Use: https://github.com/owner/repo');
      }

      const owner = match[1];
      const repoName = match[2];

      console.log(`[EnhancedIntegrationModal] Importing ${owner}/${repoName}...`);

      // Fetch the repository info from GitHub API to get full details
      const repoResponse = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-repo-details',
          token: githubToken,
          owner,
          repo: repoName,
        }),
      });

      const repoData = await repoResponse.json();

      if (!repoResponse.ok || !repoData.success) {
        throw new Error(repoData.error || 'Repository not found or not accessible');
      }

      const repo = repoData.repository;

      // Select the repository
      await handleGithubRepoSelect({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
        description: repo.description,
        isPrivate: repo.private,
        language: repo.language,
      });

      setImportUrl('');
      console.log(`[EnhancedIntegrationModal] Successfully imported ${owner}/${repoName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to import repository';
      console.error('[EnhancedIntegrationModal] Import error:', errorMsg);
      setGithubError(errorMsg);
    } finally {
      setIsImportingUrl(false);
    }
  }, [importUrl, githubToken, handleGithubRepoSelect]);

  // Helper function to extract project URL from Supabase Anon Key
  const deriveProjectUrlFromKey = (key) => {
    try {
      const parts = key.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));

      // Method 1: Check 'ref' claim (common in Supabase)
      if (payload.ref && typeof payload.ref === 'string') {
        return `https://${payload.ref}.supabase.co`;
      }

      // Method 2: Check 'sub' claim (another common pattern)
      if (payload.sub && typeof payload.sub === 'string') {
        const subParts = payload.sub.split('-');
        if (subParts.length > 0 && subParts[0].length > 0) {
          return `https://${subParts[0]}.supabase.co`;
        }
      }

      // Method 3: Check 'iss' claim for project reference
      if (payload.iss && typeof payload.iss === 'string') {
        const issMatch = payload.iss.match(/https:\/\/([^.]+)\./);
        if (issMatch) {
          return `https://${issMatch[1]}.supabase.co`;
        }
      }

      // Method 4: Check for project_id claim directly
      if (payload.project_id && typeof payload.project_id === 'string') {
        return `https://${payload.project_id}.supabase.co`;
      }

      return null;
    } catch (err) {
      return null;
    }
  };

  // Supabase: Connect
  const handleSupabaseConnect = useCallback(async () => {
    if (!supabaseKey) {
      setSupabaseError('Please enter Supabase Anon Key');
      return;
    }

    setSupabaseLoading(true);
    setSupabaseError(null);

    try {
      let derivedUrl = deriveProjectUrlFromKey(supabaseKey);

      const response = await fetch('/api/integrations/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-credentials',
          url: derivedUrl || supabaseUrl,
          key: supabaseKey,
          deriveUrl: !derivedUrl,
        }),
      });

      const data = await response.json();
      if (!data.valid) {
        throw new Error(data.error || 'Invalid credentials');
      }

      const finalUrl = data.projectUrl || derivedUrl || supabaseUrl;
      const projectId = new URL(finalUrl).hostname.split('.')[0];

      // Fetch project info and table count
      const [projectInfoRes, tablesRes] = await Promise.all([
        fetch('/api/integrations/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-project-info',
            url: finalUrl,
            key: supabaseKey,
          }),
        }),
        fetch('/api/integrations/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-tables',
            url: finalUrl,
            key: supabaseKey,
          }),
        }),
      ]);

      const projectInfo = await projectInfoRes.json();
      const tablesInfo = await tablesRes.json();

      setSupabaseUrl(finalUrl);
      setSupabaseProject({
        id: projectInfo.project?.id || projectId,
        name: projectInfo.project?.name || projectId,
        url: finalUrl,
        tableCount: tablesInfo.tableCount || 0,
        tables: tablesInfo.tables || [],
      });

      supabase.setCredentials(finalUrl, supabaseKey);

      // Save credentials to database if user is authenticated
      if (session?.user) {
        await saveCredentialsToDb('supabase', { url: finalUrl, key: supabaseKey });
      }
    } catch (err) {
      setSupabaseError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setSupabaseLoading(false);
    }
  }, [supabaseKey, supabase, session?.user, saveCredentialsToDb]);

  const handleSupabaseDisconnect = useCallback(() => {
    setSupabaseUrl('');
    setSupabaseKey('');
    setSupabaseProject(null);
    supabase.setCredentials(null, null);
  }, [supabase]);

  // Netlify: Connect and fetch sites
  const handleNetlifyConnect = useCallback(async () => {
    if (!netlifyToken) {
      setNetlifyError('Please enter a Netlify token');
      return;
    }

    setNetlifyLoading(true);
    setNetlifyError(null);

    try {
      const validateRes = await fetch('/api/integrations/netlify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate-token', token: netlifyToken }),
      });

      const validateData = await validateRes.json();
      if (!validateData.valid) {
        throw new Error(validateData.error || 'Invalid token');
      }

      setNetlifyUser(validateData.user);

      // Save credentials to database if user is authenticated
      if (session?.user) {
        await saveCredentialsToDb('netlify', { token: netlifyToken });
      }

      const sitesRes = await fetch('/api/integrations/netlify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-sites', token: netlifyToken }),
      });

      const sitesData = await sitesRes.json();
      if (sitesData.success) {
        setNetlifySites(sitesData.sites);
      }
    } catch (err) {
      setNetlifyError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setNetlifyLoading(false);
    }
  }, [netlifyToken, session?.user, saveCredentialsToDb]);

  const handleNetlifyDisconnect = useCallback(() => {
    setNetlifyToken('');
    setNetlifyUser(null);
    setNetlifySites([]);
    setSelectedNetlifySite(null);
  }, []);

  const handleNetlifySiteSelect = useCallback((site) => {
    setSelectedNetlifySite(site);
  }, []);

  // Generate environment variables
  const handleGenerateEnvVars = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/env-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-env-vars',
          githubRepo: selectedGithubRepo,
          githubToken,
          supabaseProject,
          supabaseUrl,
          supabaseKey,
          netlifyWebsite: selectedNetlifySite,
          netlifyToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEnvVars(data.envVars);
      }
    } catch (err) {
      console.error('Error generating env vars:', err);
    }
  }, [selectedGithubRepo, githubToken, supabaseProject, supabaseUrl, supabaseKey, selectedNetlifySite, netlifyToken]);

  useEffect(() => {
    if (selectedGithubRepo || supabaseProject || selectedNetlifySite) {
      handleGenerateEnvVars();
    }
  }, [selectedGithubRepo, supabaseProject, selectedNetlifySite, handleGenerateEnvVars]);

  if (!isOpen) return null;

  const handleEnvImport = (config) => {
    setImportedConfig(config);
    setShowConfigWizard(true);
  };

  const handleWizardComplete = (configuredIntegrations) => {
    if (configuredIntegrations.github?.configured && configuredIntegrations.github?.credentials?.token) {
      github.setToken(configuredIntegrations.github.credentials.token);
      if (configuredIntegrations.github?.selected?.repo) {
        github.setRepository(configuredIntegrations.github.selected.repo);
      }
    }

    if (configuredIntegrations.supabase?.configured) {
      supabase.setCredentials(
        configuredIntegrations.supabase.credentials.url,
        configuredIntegrations.supabase.credentials.key
      );
      if (configuredIntegrations.supabase?.selected?.project) {
        supabase.setSchema(configuredIntegrations.supabase.selected.project);
      }
    }

    setShowConfigWizard(false);
    setImportedConfig(null);
  };

  const connectedCount = (githubUser ? 1 : 0) + (supabaseProject ? 1 : 0) + (netlifyUser ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Connect Integrations</h1>
            <p className="text-blue-100 text-sm">GitHub • Supabase • Netlify - Auto-sync your accounts</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 flex gap-0">
          {[
            { id: 'github', label: 'Project / Repository', icon: Github },
            { id: 'supabase', label: 'Database', icon: Database },
            { id: 'netlify', label: 'Hosting', icon: Globe },
            { id: 'import', label: 'Session', icon: null },
          ].map(tab => {
            const isConnected =
              (tab.id === 'github' && githubUser) ||
              (tab.id === 'supabase' && supabaseProject) ||
              (tab.id === 'netlify' && netlifyUser);

            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {!Icon && tab.id === 'import' && <span className="text-sm">📋</span>}
                {tab.label}
                {isConnected && tab.id !== 'import' && (
                  <CheckCircle className="w-4 h-4 text-green-600 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {/* GitHub Tab */}
          {activeTab === 'github' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-3">Setup GitHub Integration for IDE</p>

                  <div className="mb-4 space-y-2">
                    <p className="font-medium text-blue-950">1. Create a Personal Access Token (PAT)</p>
                    <p className="ml-2 text-xs text-blue-800">
                      Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-700">GitHub Settings → Personal access tokens</a>
                    </p>
                  </div>

                  <div className="mb-4 space-y-2">
                    <p className="font-medium text-blue-950">2. Required Token Scopes</p>
                    <div className="ml-2 space-y-2">
                      <div className="bg-white bg-opacity-50 p-2 rounded">
                        <p className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-1">
                          <span className="text-green-600">✓</span>
                          <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">repo</code>
                        </p>
                        <p className="text-xs text-blue-800 ml-5">Full control of private repositories - <strong>Required for:</strong> creating branches, reading/writing code, committing changes</p>
                      </div>
                      <div className="bg-white bg-opacity-50 p-2 rounded">
                        <p className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-1">
                          <span className="text-green-600">✓</span>
                          <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">workflow</code>
                        </p>
                        <p className="text-xs text-blue-800 ml-5">(Optional) For accessing GitHub Actions</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
                    <p className="font-medium text-blue-950">3. Token Expiration & Security</p>
                    <ul className="ml-2 text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li>Set expiration to 90 days for better security</li>
                      <li>Keep your token secret - never share it publicly</li>
                      <li>If compromised, regenerate immediately at github.com/settings/tokens</li>
                      <li>We store your token securely and never log it</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-900">
                    <p className="font-semibold mb-1">✓ What you can do once connected:</p>
                    <ul className="ml-2 space-y-1 list-disc list-inside">
                      <li>Import any repository you have access to</li>
                      <li>Create and manage working branches automatically</li>
                      <li>Edit code in the IDE and push changes</li>
                      <li>View and select existing branches</li>
                    </ul>
                  </div>
                </div>
              </div>

              {!githubUser ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">GitHub Personal Access Token</span>
                    <input
                      type="password"
                      placeholder="ghp_..."
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  {githubError && <p className="text-sm text-red-600">{githubError}</p>}
                  <button
                    onClick={handleGithubConnect}
                    disabled={githubLoading || !githubToken}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {githubLoading && <Loader className="w-4 h-4 animate-spin" />}
                    Connect Repository
                  </button>
                </div>
              ) : (
                <PlatformAuthFlow
                  platform="github"
                  platformName="GitHub"
                  isConnected={true}
                  onDisconnect={handleGithubDisconnect}
                  email={githubUser.login}
                >
                  <div className="space-y-4">
                    {/* Quick Import by URL */}
                    <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <label className="block">
                        <span className="text-sm font-medium text-green-900 mb-2 block">Import Repository by URL</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://github.com/owner/repo"
                            value={importUrl}
                            onChange={(e) => {
                              setImportUrl(e.target.value);
                              setGithubError(null);
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && handleImportByUrl()}
                            disabled={isImportingUrl || isBranchCreating}
                            className="flex-1 px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-100"
                          />
                          <button
                            onClick={handleImportByUrl}
                            disabled={isImportingUrl || isBranchCreating || !importUrl.trim()}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                          >
                            {isImportingUrl ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              'Import'
                            )}
                          </button>
                        </div>
                      </label>
                      <p className="text-xs text-green-800">
                        Paste a GitHub URL and we'll auto-fork it and set up StackBlitz for editing.
                      </p>
                      {githubError && (
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {githubError}
                        </p>
                      )}
                    </div>

                    {githubRepos.length > 0 ? (
                      <>
                        {githubRepos.filter(r => !r.isPrivate).length > 0 ? (
                          <ResourceSelector
                            label={`Select Repository (${githubRepos.filter(r => !r.isPrivate).length} public found)`}
                            placeholder="Choose a public repository..."
                            resources={githubRepos.filter(r => !r.isPrivate)}
                            selectedId={selectedGithubRepo?.id}
                            onSelect={handleGithubRepoSelect}
                            renderOption={(repo) => {
                              const badges = [];
                              if (repo.isFork) badges.push('🍴 Fork');
                              if (repo.language) badges.push(`📝 ${repo.language}`);
                              if (repo.stars) badges.push(`⭐ ${repo.stars}`);

                              const subtitleParts = [];
                              if (repo.description) {
                                subtitleParts.push(repo.description);
                              }
                              if (badges.length > 0) {
                                subtitleParts.push(badges.join(' • '));
                              }
                              if (!repo.description && badges.length === 0) {
                                subtitleParts.push(`Branch: ${repo.defaultBranch}`);
                              }

                              return {
                                text: repo.fullName,
                                subtitle: subtitleParts.join(' — '),
                              };
                            }}
                          />
                        ) : (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>No public repositories found.</strong> All your repositories are private. Please create or fork a public repository to use with StackBlitz.
                            </p>
                          </div>
                        )}

                        {/* Branch Selector */}
                        {selectedGithubRepo && showBranchSelector && (
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-purple-900">
                                📂 Available Branches ({repoBranches.length})
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleFetchBranches(selectedGithubRepo)}
                                  disabled={branchesLoading || isCreatingNewBranch}
                                  className="text-xs px-2 py-1 bg-white border border-purple-300 rounded hover:bg-purple-50 disabled:opacity-50 transition-colors"
                                >
                                  {branchesLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                                <button
                                  onClick={handleCreateNewBranch}
                                  disabled={isCreatingNewBranch || branchesLoading}
                                  className="text-xs px-3 py-1 bg-green-600 text-white border border-green-700 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1"
                                >
                                  {isCreatingNewBranch ? (
                                    <>
                                      <Loader className="w-3 h-3 animate-spin" />
                                      Creating...
                                    </>
                                  ) : (
                                    <>
                                      <GitBranch className="w-3 h-3" />
                                      New Branch
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {branchSelectionMessage && (
                              <div className="p-3 bg-green-50 border border-green-300 rounded-lg flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <p className="text-sm text-green-800 font-medium">{branchSelectionMessage}</p>
                                <p className="text-xs text-green-700 ml-auto">Closing in a moment...</p>
                              </div>
                            )}

                            {repoBranches.length > 0 ? (
                              <div className="max-h-64 overflow-y-auto">
                                <div className="space-y-2">
                                  {repoBranches.slice(0, 10).map((branch) => (
                                    <div
                                      key={branch.name}
                                      className={`p-3 bg-white border rounded cursor-pointer transition-all ${
                                        selectedBranch === branch.name
                                          ? 'border-green-400 bg-green-50 ring-2 ring-green-300'
                                          : 'border-purple-200 hover:border-purple-400'
                                      }`}
                                      onClick={() => handleSelectBranch(branch)}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900 font-mono break-all">
                                            {branch.name}
                                          </p>
                                          <div className="flex gap-2 mt-1">
                                            {selectedBranch === branch.name && (
                                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                                                ✓ Selected
                                              </span>
                                            )}
                                            {branch.type === 'roseram' && (
                                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                                                🔧 Work Branch
                                              </span>
                                            )}
                                            {branch.default && (
                                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                                📌 Default
                                              </span>
                                            )}
                                            {branch.protected && (
                                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                                                🔒 Protected
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                                            {branch.commit}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {repoBranches.length > 10 && (
                                    <p className="text-xs text-gray-500 text-center py-2">
                                      +{repoBranches.length - 10} more branches
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-purple-800">No branches found</p>
                            )}

                            <p className="text-xs text-purple-800 bg-white p-2 rounded border border-purple-200">
                              <strong>💡 Tip:</strong> Work branches (🔧) are auto-created when you connect. Select any branch above to view its contents.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">No repositories found. Create one on GitHub to get started.</p>
                      </div>
                    )}
                  </div>
                </PlatformAuthFlow>
              )}
            </div>
          )}

          {/* Supabase Tab */}
          {activeTab === 'supabase' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Connect Database</p>
                  <p>Find your Anon Key in <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-700">your database project settings</a>. The project URL will be automatically derived from your key.</p>
                </div>
              </div>

              {!supabaseProject ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Anon Key</span>
                    <input
                      type="password"
                      placeholder="eyJ..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  {supabaseError && <p className="text-sm text-red-600">{supabaseError}</p>}
                  <button
                    onClick={handleSupabaseConnect}
                    disabled={supabaseLoading || !supabaseKey}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {supabaseLoading && <Loader className="w-4 h-4 animate-spin" />}
                    Connect Database
                  </button>
                </div>
              ) : (
                <PlatformAuthFlow
                  platform="supabase"
                  platformName="Supabase"
                  isConnected={true}
                  onDisconnect={handleSupabaseDisconnect}
                  connectionStatus={`Project: ${supabaseProject.name}`}
                >
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-medium text-blue-900 mb-3">Project Details</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Name:</span> <span className="font-semibold text-gray-900">{supabaseProject.name}</span></p>
                      <p><span className="text-gray-600">ID:</span> <code className="text-xs bg-white px-2 py-1 rounded">{supabaseProject.id}</code></p>
                      <p><span className="text-gray-600">URL:</span> <code className="text-xs bg-white px-2 py-1 rounded truncate block overflow-hidden">{supabaseProject.url}</code></p>
                      <p><span className="text-gray-600">Tables:</span> <span className="font-semibold text-gray-900">{supabaseProject.tableCount || 0}</span></p>
                      {supabaseProject.tables && supabaseProject.tables.length > 0 && (
                        <div className="mt-2">
                          <p className="text-gray-600 text-xs font-medium mb-1">Tables:</p>
                          <div className="bg-white rounded px-2 py-1 max-h-32 overflow-y-auto">
                            <ul className="text-xs space-y-0.5">
                              {supabaseProject.tables.slice(0, 10).map(table => (
                                <li key={table.id} className="text-gray-700">• {table.name}</li>
                              ))}
                              {supabaseProject.tables.length > 10 && (
                                <li className="text-gray-500 italic">+{supabaseProject.tables.length - 10} more</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </PlatformAuthFlow>
              )}
            </div>
          )}

          {/* Netlify Tab */}
          {activeTab === 'netlify' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Connect Hosting</p>
                  <p>Create a personal access token in your <a href="https://app.netlify.com/user/applications/personal-access-tokens" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-700">hosting service settings</a>.</p>
                </div>
              </div>

              {!netlifyUser ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Netlify Personal Access Token</span>
                    <input
                      type="password"
                      placeholder="nfp_..."
                      value={netlifyToken}
                      onChange={(e) => setNetlifyToken(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  {netlifyError && <p className="text-sm text-red-600">{netlifyError}</p>}
                  <button
                    onClick={handleNetlifyConnect}
                    disabled={netlifyLoading || !netlifyToken}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {netlifyLoading && <Loader className="w-4 h-4 animate-spin" />}
                    Connect Hosting
                  </button>
                </div>
              ) : (
                <PlatformAuthFlow
                  platform="netlify"
                  platformName="Netlify"
                  isConnected={true}
                  onDisconnect={handleNetlifyDisconnect}
                  email={netlifyUser.email}
                >
                  {netlifySites.length > 0 && (
                    <ResourceSelector
                      label="Select Website"
                      placeholder="Choose a website..."
                      resources={netlifySites}
                      selectedId={selectedNetlifySite?.id}
                      onSelect={handleNetlifySiteSelect}
                      renderOption={(site) => ({
                        text: site.name,
                        subtitle: `${site.domain} • ID: ${site.siteId}`,
                      })}
                    />
                  )}
                </PlatformAuthFlow>
              )}
            </div>
          )}

          {/* Session Tab */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <EnvVariableImporter onImport={handleEnvImport} />
            </div>
          )}
        </div>

        {/* Status Bar */}
        {connectedCount > 0 && (
          <div className="border-t border-gray-200 bg-blue-50 px-6 py-3">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">{connectedCount}</span> of 3 platform{connectedCount === 1 ? '' : 's'} connected
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          {!session && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Sign in to load saved integrations</p>
                <p>Load All currently loads environment variable integrations. Sign in to your account to load your saved Project/Repository, Database, and Hosting credentials.</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <button
                onClick={handleLoadAll}
                disabled={isLoadingAll || (githubUser && supabaseProject && netlifyUser)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-2"
              >
                {isLoadingAll && <Loader className="w-4 h-4 animate-spin" />}
                Load All
              </button>
              <button
                onClick={handleDisconnectAll}
                disabled={!githubUser && !supabaseProject && !netlifyUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <Unlink className="w-4 h-4" />
                Disconnect All
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>

        <ConfigurationWizard
          isOpen={showConfigWizard}
          onClose={() => {
            setShowConfigWizard(false);
            setImportedConfig(null);
          }}
          config={importedConfig || {}}
          onComplete={handleWizardComplete}
        />
      </div>
    </div>
  );
}
