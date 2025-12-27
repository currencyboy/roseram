'use client';

import React, { useState, useRef } from 'react';
import {
  Github,
  Plus,
  Upload,
  Loader,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useIntegrations } from '@/lib/integrations-context';
import { ProjectSetupModal } from './ProjectSetupModal';

export function GitHubRepositoryManager({ token, onRepositoryCreated, files = [], currentFileChanges = {} }) {
  const { github, setRepository } = useIntegrations();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pushingFiles, setPushingFiles] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [committing, setCommitting] = useState(false);

  const handleCreateProject = async (projectConfig) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          token,
          repoName: projectConfig.name,
          description: `${projectConfig.framework} project with ${projectConfig.database || 'no database'}`,
          isPrivate: false,
          projectConfig,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await response.json();
      setSuccess(`Project created: ${data.repository.owner}/${data.repository.name}`);

      // Auto-connect the repository
      if (data.repository) {
        github.setRepository({
          owner: data.repository.owner,
          name: data.repository.name,
          id: data.repository.id,
          defaultBranch: data.repository.defaultBranch,
        });

        if (onRepositoryCreated) {
          onRepositoryCreated(data.repository);
        }
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowSetupModal(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to create project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handlePushFiles = async () => {
    if (!createdRepo || !files || files.length === 0) {
      setError('No files to push');
      return;
    }

    setPushingFiles(true);
    setError(null);

    try {
      const response = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          token,
          repoName: createdRepo.name,
          files: files.map(f => ({
            path: f.path,
            content: f.content || f.originalContent || '',
          })),
          branch: createdRepo.defaultBranch || 'main',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to push files');
      }

      const data = await response.json();
      setSuccess(
        `Successfully pushed ${data.files.length} files to ${createdRepo.owner}/${createdRepo.name}`
      );

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowCreateModal(false);
        resetForm();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to push files');
    } finally {
      setPushingFiles(false);
    }
  };

  const handleDirectCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Commit message is required');
      return;
    }

    if (!github.token || !github.repository) {
      setError('No repository connected. Please connect a GitHub repository first.');
      return;
    }

    const changedFiles = Object.entries(currentFileChanges)
      .filter(([_, change]) => change.modified)
      .map(([path, change]) => ({
        path,
        content: change.modifiedContent || change.content,
      }));

    if (changedFiles.length === 0) {
      setError('No changes to commit');
      return;
    }

    setCommitting(true);
    setError(null);

    try {
      const response = await fetch('/api/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commitCode',
          owner: github.repository.owner,
          repo: github.repository.name,
          files: changedFiles.reduce((acc, f) => {
            acc[f.path] = f.content;
            return acc;
          }, {}),
          commitMessage,
          branch: github.repository.defaultBranch || 'main',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.details || 'Failed to commit');
      }

      const data = await response.json();
      setSuccess(`Successfully committed ${changedFiles.length} file(s) to ${github.repository.owner}/${github.repository.name}`);
      setCommitMessage('');

      setTimeout(() => {
        setShowCommitModal(false);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to commit changes');
    } finally {
      setCommitting(false);
    }
  };


  const handleCloseCommitModal = () => {
    setShowCommitModal(false);
    setCommitMessage('');
    setError(null);
    setSuccess(null);
  };

  const changedFilesCount = Object.values(currentFileChanges).filter(c => c.modified).length;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSetupModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          title="Create a new project with framework and integrations"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>

        {github.repository && changedFilesCount > 0 && (
          <button
            onClick={() => setShowCommitModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm"
            title={`Push ${changedFilesCount} changed file(s) to ${github.repository.owner}/${github.repository.name}`}
          >
            <Upload className="w-4 h-4" />
            Direct Commit ({changedFilesCount})
          </button>
        )}
      </div>

      <ProjectSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onProjectCreate={handleCreateProject}
        loading={loading}
      />

      {showCommitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Github className="w-5 h-5" />
                Push Direct Code Commit
              </h2>
              <button
                onClick={handleCloseCommitModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded flex items-start gap-2 text-sm">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-green-700">{success}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Repository: {github.repository?.owner}/{github.repository?.name}
                  </p>
                  <p className="text-xs text-blue-800 mb-3">
                    Branch: {github.repository?.defaultBranch || 'main'}
                  </p>
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Changes to commit: {changedFilesCount} file(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="space-y-1">
                      {Object.entries(currentFileChanges)
                        .filter(([_, change]) => change.modified)
                        .slice(0, 5)
                        .map(([path, _], i) => (
                          <li key={i} className="text-xs text-blue-800 font-mono">
                            {path}
                          </li>
                        ))}
                      {changedFilesCount > 5 && (
                        <li className="text-xs text-blue-800">
                          ... and {changedFilesCount - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commit Message *
                  </label>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Describe your changes..."
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Write a clear commit message describing your changes
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={handleCloseCommitModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>

              <button
                onClick={handleDirectCommit}
                disabled={committing || !commitMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors text-sm font-medium flex items-center gap-2"
              >
                {committing ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {committing ? 'Pushing...' : 'Push Commit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
