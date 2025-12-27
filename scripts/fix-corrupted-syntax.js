#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Define fixes for known corrupted patterns
const fixes = [
  // Fix incomplete ternary operators in CodeBuilder.jsx
  {
    file: 'components/CodeBuilder.jsx',
    patterns: [
      {
        find: /setSelectedFile\(\(prev\)\s*=>\s*prev\s*\?\s*\{\s*\.\.\.prev,\s*content\);/g,
        replace: 'setSelectedFile((prev) => prev ? { ...prev, content: prev.content } );'
      },
      {
        find: /modifiedContent,\s*modified\);/g,
        replace: 'modifiedContent,\n        modified,\n      },'
      },
      {
        find: /buildCodebaseContextString\(codebaseAnalysis\)\s*\{\s*role:\s*m\.role,\s*content,\s*\}\)\);/g,
        replace: 'buildCodebaseContextString(codebaseAnalysis);\n      const processedHistory = messageHistory.map((m) => ({\n        role: m.role,\n        content: m.content,\n      }));'
      }
    ]
  },
  // Fix IntegrationsPanel.jsx
  {
    file: 'components/IntegrationsPanel.jsx',
    patterns: [
      {
        find: /int\.name === integration\.name\s*\?\s*\{\s*\.\.\.int,\s*status\)/g,
        replace: 'int.name === integration.name ? { ...int, status: "connected" } : int'
      }
    ]
  },
  // Fix MCPIntegrations.jsx
  {
    file: 'components/MCPIntegrations.jsx',
    patterns: [
      {
        find: /setEnvValues>(\{\})/g,
        replace: 'setEnvValues$1'
      },
      {
        find: /int\.id === id\s*\?\s*\{\s*\.\.\.int,\s*configured\)/g,
        replace: 'int.id === id ? { ...int, configured: true } : int'
      }
    ]
  }
];

console.log('🔧 Fixing corrupted syntax...\n');

for (const fix of fixes) {
  const filePath = path.join(PROJECT_ROOT, fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fix.file}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  for (const pattern of fix.patterns) {
    if (pattern.find.test(content)) {
      content = content.replace(pattern.find, pattern.replace);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${fix.file}`);
  }
}

console.log('\n✅ Syntax fixes complete!');
