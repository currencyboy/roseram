'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Zap, Copy, Download, Loader } from 'lucide-react';

export default function AIGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generationType, setGenerationType] = useState('code');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);
    setOutput(null);

    try {
      const response = await fetch('/api/ai/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          generationType,
          generateLayout: generationType === 'layout',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      setOutput(data.content || data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text, section) {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  }

  function downloadCode() {
    if (!output) return;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Page</title>
  <style>
${output.css || ''}
  </style>
</head>
<body>
${output.html || ''}
<script>
${output.javascript || ''}
</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-page.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout currentPage="ai">
      <div className="h-full overflow-auto bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl font-bold text-gray-900">AI Generator</h1>
          </div>
          <p className="text-gray-600">Generate code, content, and layouts</p>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Generation Settings</h2>

                {/* Generation Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What would you like to generate?
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'code', label: 'Code (HTML/CSS/JS)' },
                      { value: 'content', label: 'Content & Copy' },
                      { value: 'layout', label: 'Page Layout' },
                      { value: 'design', label: 'Design Suggestions' },
                    ].map(option => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="generationType"
                          value={option.value}
                          checked={generationType === option.value}
                          onChange={(e) => setGenerationType(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create... (e.g., 'Create a modern landing page for a SaaS product with hero section, features, pricing, and CTA')"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={6}
                    disabled={generating}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {generating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>

                {/* Tips */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Tips</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Be specific about design preferences</li>
                    <li>• Include desired features and functionality</li>
                    <li>• Mention target audience</li>
                    <li>• Specify color schemes or styling</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Output Section */}
            <div className="lg:col-span-2">
              {!output ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No generation yet</h3>
                  <p className="text-gray-600 mb-6">
                    {`Enter a prompt and click "Generate" to see your results`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* HTML Output */}
                  {output.html && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">HTML</h3>
                        <button
                          onClick={() => copyToClipboard(output.html || '', 'html')}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          {copiedSection === 'html' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="p-6 overflow-x-auto bg-gray-900 text-gray-100 text-sm font-mono">
                        <code>{output.html}</code>
                      </pre>
                    </div>
                  )}

                  {/* CSS Output */}
                  {output.css && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">CSS</h3>
                        <button
                          onClick={() => copyToClipboard(output.css || '', 'css')}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          {copiedSection === 'css' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="p-6 overflow-x-auto bg-gray-900 text-gray-100 text-sm font-mono">
                        <code>{output.css}</code>
                      </pre>
                    </div>
                  )}

                  {/* JavaScript Output */}
                  {output.javascript && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">JavaScript</h3>
                        <button
                          onClick={() => copyToClipboard(output.javascript || '', 'js')}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          {copiedSection === 'js' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="p-6 overflow-x-auto bg-gray-900 text-gray-100 text-sm font-mono">
                        <code>{output.javascript}</code>
                      </pre>
                    </div>
                  )}

                  {/* Content Output */}
                  {output.content && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Generated Content</h3>
                      <div className="prose prose-sm max-w-none">
                        {output.content}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Metadata</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {output.framework && (
                        <div>
                          <p className="text-sm text-gray-600">Framework</p>
                          <p className="font-medium text-gray-900">{output.framework}</p>
                        </div>
                      )}
                      {output.dependencies && output.dependencies.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600 mb-2">Dependencies</p>
                          <div className="flex flex-wrap gap-2">
                            {output.dependencies.map(dep => (
                              <span
                                key={dep}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium"
                              >
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={downloadCode}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
