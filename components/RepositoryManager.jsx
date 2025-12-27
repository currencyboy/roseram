'use client';

import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, ChevronDown, Search } from 'lucide-react';
import { useIntegrations } from '@/lib/integrations-context';

export function RepositoryManager({ onRepositorySelected }) {
  const { github } = useIntegrations();
  const [repositories, setRepositories] = useState([]);
  const [filteredRepositories, setFilteredRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);

  useEffect(() => {
    if (github.token) {
      fetchRepositories();
    }
  }, [github.token]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = repositories.filter(repo =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRepositories(filtered);
    } else {
      setFilteredRepositories(repositories);
    }
  }, [searchTerm, repositories]);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/integrations/repositories?action=list', {
        headers: {
          'X-GitHub-Token': github.token,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repositories');
      }

      const data = await response.json();
      setRepositories(data.repositories || []);
      setFilteredRepositories(data.repositories || []);
    } catch (err) {
      console.error('Error fetching repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepository = (repo) => {
    setSelectedRepo(repo);
    setShowDropdown(false);
    setSearchTerm('');

    github.setRepository({
      owner: repo.owner,
      name: repo.name,
      id: repo.id,
      defaultBranch: repo.defaultBranch,
    });

    if (onRepositorySelected) {
      onRepositorySelected({
        owner: repo.owner,
        name: repo.name,
        id: repo.id,
        defaultBranch: repo.defaultBranch,
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Select GitHub Repository</h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Repository Selector */}
      <div className="relative">
        {/* Dropdown Button */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading || repositories.length === 0}
        >
          <span className={selectedRepo ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {selectedRepo ? selectedRepo.fullName : 'Choose a repository...'}
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Search and Dropdown List */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search repositories"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Repository List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader className="w-5 h-5 animate-spin" />
                </div>
              ) : filteredRepositories.length > 0 ? (
                <ul className="space-y-0">
                  {filteredRepositories.map(repo => (
                    <li
                      key={repo.id}
                      onClick={() => handleSelectRepository(repo)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{repo.name}</p>
                      <p className="text-xs text-gray-600">{repo.fullName}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {repositories.length === 0 ? 'No repositories available' : 'No repositories found'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
