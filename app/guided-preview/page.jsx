'use client';

import React, { useState, useEffect } from 'react';
import { GuidedSpritesPreview } from '@/components/GuidedSpritesPreview';
import { AlertCircle, Info } from 'lucide-react';

export default function GuidedPreviewPage() {
  const [projectId] = useState('demo-preview');
  const [currentBranch, setCurrentBranch] = useState(null);
  const [repository, setRepository] = useState(null);

  // Example data - in a real app this would come from context or props
  useEffect(() => {
    // Set default branch and repository
    setCurrentBranch({
      owner: 'belonio2793',
      repo: 'backlinkoo-promotions',
      name: 'main',
    });

    setRepository({
      name: 'backlinkoo-promotions',
      url: 'https://github.com/belonio2793/backlinkoo-promotions',
    });
  }, []);

  const handlePreviewReady = (url) => {
    console.log('[GuidedPreviewPage] Preview ready:', url);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Guided Sprites Preview
          </h1>
          <p className="text-gray-600 text-sm">
            Step-by-step preview configuration with real-time status monitoring and transparent data fetching
          </p>
        </div>
      </div>

      {/* Info Panels */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Features Info */}
          <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Features:</strong> Manual start (no auto-load), configuration panel, real-time logs, transparent data fetching, step-by-step guidance
            </div>
          </div>

          {/* Current Setup Info */}
          <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <strong>Demo Setup:</strong> Repository is pre-loaded. Click "Start Preview" to begin the step-by-step process.
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="max-w-7xl mx-auto h-full">
          {currentBranch && repository ? (
            <GuidedSpritesPreview
              projectId={projectId}
              currentBranch={currentBranch}
              repository={repository}
              onPreviewReady={handlePreviewReady}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-white rounded-lg shadow-lg">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading preview configuration...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Instructions */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            How It Works:
          </h3>
          <ol className="text-xs text-gray-600 space-y-1 ml-4">
            <li>
              <strong>Step 1 - Configure:</strong> Set your repository, branch, package manager, and dev script
            </li>
            <li>
              <strong>Step 2 - Start:</strong> Click "Start Preview" to launch the Sprites sandbox
            </li>
            <li>
              <strong>Step 3 - Monitor:</strong> Watch real-time logs showing exact API calls and data being processed
            </li>
            <li>
              <strong>Step 4 - Access:</strong> Once running, the preview iframe loads automatically with live preview URL
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
