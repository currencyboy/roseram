'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, Github, Code, Zap } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { UnifiedPreview } from './UnifiedPreview';
import { QuickPreview } from './QuickPreview';

/**
 * Enhanced Preview Component
 * - Syncs with Status tab (currentBranch, repository)
 * - Shows Fly.io preview WITHOUT authentication (boots instantly)
 * - Falls back to UnifiedPreview for manual selection
 */
export function EnhancedPreview({
  projectId,
  currentBranch,
  repository,
  onOpenIntegrations,
  onInitiateDeployment,
  onPreviewStatusChange,
}) {
  const { session } = useAuth();
  const [previewError, setPreviewError] = useState(null);
  const [useManualSelection, setUseManualSelection] = useState(false);

  // Generate effective projectId (use provided or generate temporary)
  const effectiveProjectId = projectId || `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (!projectId && effectiveProjectId) {
    console.warn('[EnhancedPreview] No projectId provided, using temporary ID:', effectiveProjectId);
  }

  // Callback for preview URL ready
  const handleUrlReady = useCallback((url) => {
    console.log('[EnhancedPreview] Preview URL ready:', url);
    // Notify parent component of preview ready
    onPreviewStatusChange?.({
      status: 'ready',
      url: url,
    });
  }, [onPreviewStatusChange]);

  // If Status tab data is available, use quick preview (no auth required!)
  if (currentBranch && repository && !useManualSelection) {
    return (
      <QuickPreview
        projectId={effectiveProjectId}
        currentBranch={currentBranch}
        repository={repository}
        onUrlReady={handleUrlReady}
        onError={(error) => {
          console.error('[EnhancedPreview] Preview error:', error);
          setPreviewError(error);
          onPreviewStatusChange?.({
            status: 'error',
            error: error,
          });
        }}
      />
    );
  }

  // Show helpful error if configuration is missing
  if (!currentBranch || !repository) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-200 rounded-full opacity-20" />
              <AlertCircle className="w-16 h-16 text-orange-600 relative z-10" />
            </div>
          </div>

          {/* Title and message */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Preview Not Ready</h3>
            <p className="text-sm text-gray-700 mb-4">
              Your repository needs to be set up before we can preview it.
            </p>

            {/* What's missing */}
            <div className="bg-white rounded-lg border border-orange-200 p-4 mb-6 text-left space-y-3">
              {!currentBranch && (
                <div className="flex gap-3">
                  <Github className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">No branch selected</p>
                    <p className="text-gray-600 text-xs">Create or select a working branch to continue</p>
                  </div>
                </div>
              )}

              {!repository && (
                <div className="flex gap-3">
                  <Github className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">No repository connected</p>
                    <p className="text-gray-600 text-xs">Connect your GitHub repository first</p>
                  </div>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-left space-y-3">
              <p className="text-sm font-semibold text-blue-900">Next steps:</p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Go to the <strong>Status</strong> tab</li>
                <li>Connect your GitHub account if not already done</li>
                <li>Select a repository</li>
                <li>Create or select a working branch</li>
                <li>Return here to see your live preview</li>
              </ol>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setUseManualSelection(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Try Manual Preview Selection
            </button>
            <button
              onClick={() => onOpenIntegrations?.()}
              className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              Connect Integrations
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fall back to unified preview for manual selection
  return (
    <UnifiedPreview
      projectId={projectId}
      onIntegrationNeeded={() => onOpenIntegrations?.()}
    />
  );
}

export default EnhancedPreview;
