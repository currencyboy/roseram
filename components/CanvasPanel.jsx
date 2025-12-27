"use client";

export function CanvasPanel({ html, css, javascript }) {
  const iframeContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>${html}<script>${javascript}</script></body>
</html>`;

  return (
    <div className="flex-1 bg-gray-100 border-r border-gray-700 overflow-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <iframe
            srcDoc={iframeContent}
            className="w-full h-full border-0"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
