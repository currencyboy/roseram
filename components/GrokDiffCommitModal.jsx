'use client';

import React, { useState } from 'react';
import { Check, X, AlertCircle, Loader } from 'lucide-react';
import { FileDiffPreview } from './FileDiffPreview';

/**
 * Modal component for reviewing Grok-generated diffs before auto-committing
 * Shows:
 * - File changes preview
 * - Commit message editor
 * - Approve/Reject buttons
 * - Error states
 */
export function GrokDiffCommitModal({
  isOpen = false,
  pendingDiff = null,
  commitState = {},
  onApprove,
  onReject,
  loading = false,
}) {
  const [commitMessage, setCommitMessage] = useState('');

  if (!isOpen || !pendingDiff) {
    return null;
  }

  const { files = [], diffs = [], summary = {}, prompt = '' } = pendingDiff;
  const { loading: isCommitting = false, error, success } = commitState;

  // Generate default commit message if not set
  const defaultMessage = `[Grok] Update ${summary.created || 0} file(s), modify ${summary.changed || 0} file(s)`;
  const finalMessage = commitMessage || defaultMessage;

  const handleApprove = () => {
    onApprove(finalMessage);
  };

  const handleReject = () => {
    setCommitMessage('');
    onReject();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>📝 Review Grok Changes</span>
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            {summary.summary || `${files.length} file(s) generated`}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Original Prompt */}
          {prompt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">
                <strong>Original prompt:</strong>
              </p>
              <p className="text-sm text-blue-900 italic">"{prompt}"</p>
            </div>
          )}

          {/* File Diffs */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              File Changes ({diffs.length})
            </h3>
            <FileDiffPreview
              changes={diffs}
              onApply={() => {}}
              onCancel={() => {}}
              loading={false}
            />
          </div>

          {/* Commit Message Editor */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Commit Message
            </label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={defaultMessage}
              disabled={isCommitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              rows={4}
            />
            {!commitMessage && (
              <p className="text-xs text-gray-500 mt-1">
                Default: {defaultMessage}
              </p>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 text-sm">Commit Failed</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 text-sm">
                  Committed Successfully!
                </p>
                <p className="text-green-700 text-sm">
                  {files.length} file(s) committed to branch
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          {!success && (
            <>
              <button
                onClick={handleReject}
                disabled={isCommitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-medium transition flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isCommitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition flex items-center gap-2"
              >
                {isCommitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve & Commit
                  </>
                )}
              </button>
            </>
          )}
          {success && (
            <button
              onClick={handleReject}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GrokDiffCommitModal;
