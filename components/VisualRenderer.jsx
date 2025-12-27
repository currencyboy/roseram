"use client";

import { useState, useMemo } from "react";
import { Eye, Code, Maximize2, Minimize2 } from "lucide-react";

export function VisualRenderer({
  files,
  selectedFile,
  onFileSelect,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState("preview");

  // Detect app type and find entry point
  const appInfo = useMemo(() => {
    const htmlFiles = Object.keys(files).filter(f => f.endsWith('.html'));
    const reactFiles = Object.keys(files).filter(f => 
      (f.endsWith('.tsx') || f.endsWith('.jsx')) && 
      (f.includes('app') || f.includes('index') || f.includes('main'))
    );
    const nextFiles = Object.keys(files).filter(f => f.includes('page.tsx'));

    let type = 'static';
    let entryPoint = selectedFile;

    if (nextFiles.length > 0) {
      type = 'next-js';
      entryPoint = nextFiles[0];
    } else if (reactFiles.length > 0) {
      type = 'react';
      entryPoint = reactFiles[0];
    } else if (htmlFiles.length > 0) {
      type = 'html';
      entryPoint = htmlFiles[0];
    }

    return { type, entryPoint, htmlFiles, reactFiles, nextFiles };
  }, [files, selectedFile]);

  // Build HTML preview for static files
  const previewContent = useMemo(() => {
    if (appInfo.type === 'html' && appInfo.entryPoint) {
      return files[appInfo.entryPoint];
    }

    // For React/Next.js, create a simple placeholder
    if (appInfo.type === 'react' || appInfo.type === 'next-js') {
      const srcContent = files[appInfo.entryPoint || ''] || '';
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application Preview</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .preview-placeholder { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .preview-content { max-width: 600px; }
            h1 { margin-bottom: 20px; font-size: 2.5rem; }
            p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px; }
            .info { 
              background: rgba(255,255,255,0.1); 
              padding: 20px; 
              border-radius: 8px; 
              margin-top: 30px;
              text-align: left;
            }
            .info h3 { margin-bottom: 10px; }
            .info ul { list-style: none; }
            .info li { padding: 5px 0; }
            code { 
              background: rgba(0,0,0,0.2); 
              padding: 2px 6px; 
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }
          </style>
        </head>
        <body>
          <div class="preview-placeholder">
            <div class="preview-content">
              <h1>${appInfo.type.toUpperCase().replace('-', ' ')} Application</h1>
              <p>Application loaded and ready for visualization</p>
              <div class="info">
                <h3>📦 Application Info</h3>
                <ul>
                  <li><strong>Type:</strong> <code>${appInfo.type}</code></li>
                  <li><strong>Files:</strong> ${Object.keys(files).length}</li>
                  <li><strong>Entry Point:</strong> <code>${appInfo.entryPoint}</code></li>
                  <li><strong>Language:</strong> TypeScript/JSX</li>
                </ul>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    return '';
  }, [appInfo, files]);

  const isFullscreenClass = isFullscreen ? 'fixed inset-0 z-50 bg-white' : '';

  return (
    <div className={`flex flex-col h-full ${isFullscreenClass}`}>
      {/* Toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">
              {appInfo.type.replace('-', ' ').toUpperCase()} Application
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {Object.keys(files).length} files • {appInfo.type} app
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Toggle view mode"
          >
            <Code className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white">
        {viewMode === 'preview' ? (
          <iframe
            srcDoc={previewContent}
            className="w-full h-full border-0"
            title="Application Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="overflow-auto h-full">
            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(files).map(([path, content]) => (
                    <div
                      key={path}
                      onClick={() => onFileSelect?.(path)}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedFile === path
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                      }`}
                    >
                      <p className="font-mono text-sm text-gray-900 truncate mb-2">{path}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(content.length / 1024)} KB
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 font-mono">
                        {content.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedFile && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {selectedFile}
                  </h3>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                    <code>{files[selectedFile]}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
