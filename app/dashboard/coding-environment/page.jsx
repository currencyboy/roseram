'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Zap, Copy, Download, Loader, Eye, Code, Settings } from 'lucide-react';

export default function CodingEnvironment() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);
  const [previewMode, setPreviewMode] = useState('split');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (output && iframeRef.current) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
${output.css || ''}
  </style>
</head>
<body>
${output.html || '<div>Loading...</div>'}
<script>
${output.javascript || ''}
</script>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [output]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError(null);
    setOutput(null);

    try {
      const response = await fetch('/api/grok-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      
      const content = data.code || '';
      const htmlMatch = content.match(/```html\n([\s\S]*?)```/);
      const cssMatch = content.match(/```css\n([\s\S]*?)```/);
      const jsMatch = content.match(/```(?:javascript|js)\n([\s\S]*?)```/);

      setOutput({
        html: htmlMatch ? htmlMatch[1].trim() : extractBasicHTML(content),
        css: cssMatch ? cssMatch[1].trim() : '',
        javascript: jsMatch ? jsMatch[1].trim() : '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code');
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  }

  function extractBasicHTML(content) {
    const match = content.match(/<html[\s\S]*?<\/html>|<div[\s\S]*?<\/div>|<body[\s\S]*?<\/body>/i);
    return match ? match[0] : '<div class="p-8"><h1>Generated Content</h1><p>' + content.substring(0, 200) + '...</p></div>';
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
  <title>Generated Application</title>
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
    a.download = 'generated-app.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  const renderCodeBlock = (code, language, title) => {
    if (!code) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={() => copyToClipboard(code, language.toLowerCase())}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copiedSection === language.toLowerCase() ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="p-6 overflow-x-auto bg-gray-900 text-gray-100 text-sm font-mono max-h-80">
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  return (
    <DashboardLayout currentPage="coding">
      <div className="h-full overflow-auto bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Coding Environment</h1>
                <p className="text-gray-600">Generate and preview code</p>
              </div>
            </div>
            {output && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('split')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    previewMode === 'split'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Split
                  </div>
                </button>
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    previewMode === 'preview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </div>
                </button>
                <button
                  onClick={() => setPreviewMode('code')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    previewMode === 'code'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Code
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-120px)]">
          {/* Input Panel */}
          <div
            className={`${
              previewMode === 'preview' ? 'hidden' : 'w-full lg:w-1/3'
            } bg-white border-r border-gray-200 overflow-auto`}
          >
            <div className="p-6 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Prompt
              </h2>

              {/* Prompt Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like to generate?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create... (e.g., 'Create a modern dashboard with charts and metrics')"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={8}
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {generating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Code
                  </>
                )}
              </button>

              {/* Tips */}
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 text-sm mb-2">💡 Pro Tips</h4>
                <ul className="text-xs text-purple-800 space-y-1">
                  <li>• Be specific about design and functionality</li>
                  <li>• Mention color schemes and styling preferences</li>
                  <li>• Describe interactive features you want</li>
                  <li>{`• Include layout preferences (grid, flex, etc.)`}</li>
                </ul>
              </div>
            </div>

            {/* Generated Code Display */}
            {output && (
              <div className="p-6 border-t border-gray-200 space-y-4">
                <h3 className="font-semibold text-gray-900">Generated Code</h3>
                <div className="space-y-3 text-sm">
                  {output.html && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-900 font-medium">✓ HTML</p>
                      <p className="text-blue-700 text-xs mt-1">{output.html.length} characters</p>
                    </div>
                  )}
                  {output.css && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-900 font-medium">✓ CSS</p>
                      <p className="text-green-700 text-xs mt-1">{output.css.length} characters</p>
                    </div>
                  )}
                  {output.javascript && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-yellow-900 font-medium">✓ JavaScript</p>
                      <p className="text-yellow-700 text-xs mt-1">{output.javascript.length} characters</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={downloadCode}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm mt-4"
                >
                  <Download className="w-4 h-4" />
                  Download HTML
                </button>
              </div>
            )}
          </div>

          {/* Preview/Code Panel */}
          {output && (previewMode === 'split' || previewMode === 'preview') && (
            <div
              className={`${
                previewMode === 'split' ? 'w-2/3' : 'w-full'
              } overflow-auto`}
            >
              <div className="bg-white h-full p-6">
                <div className="h-full rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50">
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Code View */}
          {output && (previewMode === 'split' || previewMode === 'code') && (
            <div
              className={`${
                previewMode === 'split' ? 'hidden lg:flex lg:w-1/2' : 'w-full'
              } flex-col overflow-auto`}
            >
              <div className="overflow-auto flex-1 p-6 space-y-6">
                {renderCodeBlock(output.html, 'HTML', 'HTML')}
                {renderCodeBlock(output.css, 'CSS', 'CSS')}
                {renderCodeBlock(output.javascript, 'JavaScript', 'JavaScript')}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!output && (
            <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
              <div className="text-center">
                <Code className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No code generated yet</h3>
                <p className="text-gray-600">
                  {`Enter a prompt and click "Generate Code" to see your code in action`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
