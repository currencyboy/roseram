'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Copy, Trash2, Plus, Eye, Save, Loader, ChevronLeft, Maximize, Settings, Code } from 'lucide-react';

const BLOCK_TEMPLATES = {
  hero: {
    title: 'Hero Section',
    icon: 'hero',
    content: '<h1>Welcome to Your Website</h1><p>Add your tagline here</p>',
    html: '<section class="hero"><div class="container"><h1>Welcome to Your Website</h1><p>Add your tagline here</p></div></section>',
    css: '.hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 20px; text-align: center; }',
  },
  features: {
    title: 'Features Section',
    icon: '⭐',
    content: '<h2>Our Features</h2><div class="features-grid"></div>',
    html: '<section class="features"><div class="container"><h2>Our Features</h2><div class="features-grid"><div class="feature"><h3>Feature 1</h3></div><div class="feature"><h3>Feature 2</h3></div><div class="feature"><h3>Feature 3</h3></div></div></div></section>',
    css: '.features { padding: 60px 20px; } .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }',
  },
  cta: {
    title: 'Call to Action',
    icon: 'action',
    content: '<h2>Ready to get started?</h2><button>Sign Up Now</button>',
    html: '<section class="cta"><div class="container"><h2>Ready to get started?</h2><button class="btn-primary">Sign Up Now</button></div></section>',
    css: '.cta { background: #f5f5f5; padding: 60px 20px; text-align: center; }',
  },
  testimonials: {
    title: 'Testimonials',
    icon: '💬',
    content: '<h2>What Our Clients Say</h2><div class="testimonials"></div>',
    html: '<section class="testimonials"><div class="container"><h2>What Our Clients Say</h2><div class="testimonials-grid"><div class="testimonial"><p>Great service!</p><p class="author">- Client</p></div></div></div></section>',
    css: '.testimonials { padding: 60px 20px; } .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }',
  },
  pricing: {
    title: 'Pricing',
    icon: '💰',
    content: '<h2>Our Pricing Plans</h2><div class="pricing-grid"></div>',
    html: '<section class="pricing"><div class="container"><h2>Our Pricing Plans</h2><div class="pricing-grid"><div class="plan"><h3>Basic</h3><p class="price">$29/mo</p><ul><li>Feature 1</li><li>Feature 2</li></ul></div></div></div></section>',
    css: '.pricing { padding: 60px 20px; background: #fafafa; } .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }',
  },
};

export default function VisualPageBuilder({
  site,
  initialContent = { blocks: [] },
  onSave,
  isLoading = false,
}) {
  const [blocks, setBlocks] = useState(initialContent.blocks);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const previewRef = useRef(null);

  const addBlock = (templateKey) => {
    const template = BLOCK_TEMPLATES[templateKey];
    const newBlock = {
      id: `block-${Date.now()}`,
      type: templateKey,
      content: template.content,
      html: template.html,
      css: template.css,
      settings: {},
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id, updates) => {
    setBlocks(blocks.map(block =>
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const duplicateBlock = (id) => {
    const blockToDuplicate = blocks.find(b => b.id === id);
    if (!blockToDuplicate) return;

    const newBlock = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
    };
    const index = blocks.findIndex(b => b.id === id);
    setBlocks([...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)]);
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave({ blocks });
      alert('Page saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewHTML = () => {
    const blockHTML = blocks
      .map(block => block.html || `<section>${block.content}</section>`)
      .join('\n');

    const blockCSS = blocks
      .filter(block => block.css)
      .map(block => block.css)
      .join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    h1, h2, h3 { margin-bottom: 1rem; }
    p { margin-bottom: 1rem; }
    button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #5568d3; }
    ${blockCSS}
  </style>
</head>
<body>
  ${blockHTML}
</body>
</html>
    `;
  };

  if (previewMode) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Page Preview</h2>
            <p className="text-sm text-gray-600">{site?.name || 'Untitled'}</p>
          </div>
          <button
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Editor
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-8">
          <div className="max-w-4xl mx-auto">
            <iframe
              ref={previewRef}
              srcDoc={getPreviewHTML()}
              className="w-full h-full border-none bg-white rounded-lg shadow-lg"
              title="Page Preview"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <Link href="/dashboard/sites" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Sites
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{site?.name || 'Untitled'}</h2>
            <p className="text-sm text-gray-600 mt-1">Visual Page Builder</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Components
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BLOCK_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => addBlock(key)}
                  className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all font-medium text-sm flex flex-col items-center gap-1 border border-blue-200"
                >
                  <span className="text-lg">{template.icon}</span>
                  <span className="text-xs">{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedBlockId && (
            <div className="p-6 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Block Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => duplicateBlock(selectedBlockId)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => deleteBlock(selectedBlockId)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCodePanel(!showCodePanel)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <Code className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {isSaving ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 p-8">
          <div className="max-w-4xl mx-auto">
            {blocks.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 h-96 flex items-center justify-center">
                <div className="text-center">
                  <Maximize className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">No blocks added yet</p>
                  <p className="text-sm text-gray-500">Add components from the left sidebar to build your page</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {blocks.map((block, idx) => (
                  <div key={block.id}>
                    <div
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`bg-white rounded-lg overflow-hidden shadow-sm border-2 cursor-pointer transition-all ${
                        selectedBlockId === block.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className={`px-6 py-3 border-b ${selectedBlockId === block.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 text-sm">
                            {BLOCK_TEMPLATES[block.type]?.title || 'Block'} #{idx + 1}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                            {block.type}
                          </span>
                        </div>
                      </div>

                      <div className="p-8 bg-white min-h-32 prose prose-sm max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: block.html || block.content,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCodePanel && (
        <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden shadow-xl">
          <div className="border-b border-gray-800 p-4 flex items-center justify-between">
            <h3 className="font-bold text-white">Generated HTML</h3>
            <button
              onClick={() => setShowCodePanel(false)}
              className="text-gray-400 hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
              {getPreviewHTML()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
