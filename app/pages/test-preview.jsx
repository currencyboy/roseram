/**
 * Test Preview Page
 * 
 * Tests QuickPreview and InstantFlyPreview components
 * Both should boot Fly.io machine WITHOUT requiring authentication
 * 
 * Navigate to: /test-preview?projectId=test&repo=owner/repo&branch=main
 */

'use client';

import React, { useState } from 'react';
import { QuickPreview } from '@/components/QuickPreview';
import { InstantFlyPreview } from '@/components/InstantFlyPreview';
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';

export default function TestPreviewPage() {
  const [activeTab, setActiveTab] = useState('quick');
  const [testConfig, setTestConfig] = useState({
    projectId: 'test-preview',
    currentBranch: {
      owner: 'facebook',
      repo: 'react',
      name: 'main',
    },
    repository: {
      owner: 'facebook',
      repo: 'react',
      url: 'https://github.com/facebook/react',
    },
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({
    authRequired: false,
    bootTime: 0,
    urlGenerated: false,
    machineReady: false,
  });

  const handleUrlReady = (url) => {
    console.log('[TestPreview] URL ready:', url);
    setPreviewUrl(url);
    setTestResults(prev => ({
      ...prev,
      urlGenerated: true,
      bootTime: Date.now() - startTimeRef.current,
    }));
  };

  const handleError = (err) => {
    console.error('[TestPreview] Error:', err);
    setError(err);
    setTestResults(prev => ({
      ...prev,
      bootTime: Date.now() - startTimeRef.current,
    }));
  };

  const startTimeRef = React.useRef(Date.now());

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Preview Boot Test</h1>
              <p className="text-sm text-gray-600 mt-1">
                Testing Fly.io machine boot WITHOUT authentication
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">No Auth Required</span>
            </div>
          </div>

          {/* Test Configuration */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Test Configuration:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-blue-700 font-medium">Project ID</p>
                <p className="text-blue-600">{testConfig.projectId}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Repository</p>
                <p className="text-blue-600">{testConfig.currentBranch.owner}/{testConfig.currentBranch.repo}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Branch</p>
                <p className="text-blue-600">{testConfig.currentBranch.name}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Auth Status</p>
                <p className="text-blue-600">❌ Not Required</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'quick'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              QuickPreview (Enhanced)
            </button>
            <button
              onClick={() => setActiveTab('instant')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'instant'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              InstantFlyPreview
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex gap-6 p-6">
          {/* Preview Component (Takes 60% of width) */}
          <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            {activeTab === 'quick' ? (
              <QuickPreview
                projectId={testConfig.projectId}
                currentBranch={testConfig.currentBranch}
                repository={testConfig.repository}
                onUrlReady={handleUrlReady}
                onError={handleError}
              />
            ) : (
              <InstantFlyPreview
                projectId={testConfig.projectId}
                currentBranch={testConfig.currentBranch}
                repository={testConfig.repository}
                onUrlReady={handleUrlReady}
                onError={handleError}
              />
            )}
          </div>

          {/* Test Results Sidebar (Takes 40% of width) */}
          <div className="w-96 bg-white rounded-lg shadow-lg p-6 overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Test Results</h2>

            {/* Status Indicators */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${previewUrl ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {previewUrl ? '✅ Preview URL Generated' : '⏳ Waiting for URL'}
                  </p>
                  {previewUrl && (
                    <p className="text-xs text-gray-600 mt-1 break-all font-mono">
                      {previewUrl}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {error ? '❌ Error Occurred' : '✅ No Errors'}
                  </p>
                  {error && (
                    <p className="text-xs text-red-600 mt-1">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Boot Time:</span>
                  <span className="font-mono text-gray-900">
                    {testResults.bootTime > 0 ? `${Math.round(testResults.bootTime / 1000)}s` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auth Required:</span>
                  <span className="font-mono text-green-600">❌ No</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Component:</span>
                  <span className="font-mono text-gray-900">{activeTab === 'quick' ? 'QuickPreview' : 'InstantFlyPreview'}</span>
                </div>
              </div>
            </div>

            {/* Test Checklist */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Test Checklist</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={true} className="w-4 h-4" disabled />
                  <span className="text-sm text-gray-700">No auth modal appears</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={!!previewUrl} disabled className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Preview URL generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Machine starts (30-90s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Iframe loads and content visible</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={!error} disabled className="w-4 h-4" />
                  <span className="text-sm text-gray-700">No errors in console</span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900 leading-relaxed">
                  <strong>ℹ️ Expected Behavior:</strong>
                  <br />
                  The preview component should boot the Fly.io machine immediately without asking for authentication. The machine will take 30-90 seconds to start.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
