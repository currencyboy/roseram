#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'];

console.log('🚀 Stripping TypeScript syntax from JavaScript files...\n');

function findJavaScriptFiles(dir = PROJECT_ROOT) {
  let jsFiles = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && EXCLUDED_DIRS.includes(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory() && entry.name.startsWith('.') && entry.name !== '.github') {
        continue;
      }
      
      if (entry.isDirectory()) {
        jsFiles = jsFiles.concat(findJavaScriptFiles(fullPath));
      } else if (['.js', '.jsx'].includes(path.extname(entry.name))) {
        jsFiles.push(fullPath);
      }
    }
  } catch (err) {
    // Silently skip directories we can't read
  }
  
  return jsFiles;
}

function stripTypeScript(content) {
  // Remove type imports= content.replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]/g, '');
  
  // Remove type-only imports on separate lines
  content = content.replace(/import\s+type\s+[^\n;]+;?/g, '');
  
  // Remove interfaces and types
  content = content.replace(/^(export\s+)?(interface|type)\s+\w+(\s*<[^>]*>)?\s*\{[^}]*\}/gm, '');
  
  // Remove enum declarations
  content = content.replace(/^(export\s+)?enum\s+\w+\s*\{[^}]*\}/gm, '');
  
  // Remove type parameters from function declarations
  // export async function GET(request) -> export async function GET(request)
  content = content.replace(/(\bfunction\s+\w+)<[^>]*>/g, '$1');
  content = content.replace(/(\w+\s*)<([^>]*)>/g, (match, name, params) => {
    // Only apply if this looks like a generic (avoid false positives in comparisons)
    if (name.match(/\bfunction\s+\w+$|^const\s+\w+\s*=$/) || params.includes(',')) {
      return name;
    }
    return match;
  });
  
  // Remove parameter type annotations: (param) -> (param)
  content = content.replace(/(\(|,\s*)(\w+)\s*:\s*[^,)]+/g, '$1$2');
  
  // Remove return type annotations: ) { -> ) {
  content = content.replace(/\)\s*:\s*[^{]+\{/g, ') {');
  
  // Remove property type annotations in object/class context
  // This regex removes ": Type" in property definitions but preserves object literals
  content = content.replace(/(\w+)\s*:\s*([A-Z]\w+|string|number|boolean|any|void|Array|Record|Promise|React\.\w+)(\s*[,;=\)\]\}])/g, '$1$3');
  
  // Remove generic type arguments from variables
  // const x = -> const x =
  content = content.replace(/:\s*\w+<[^>]*>\s*=/g, ' =');
  
  // Remove type assertions (as Type or <Type>)
  content = content.replace(/\s+as\s+\w+(?:<[^>]*>)?(?=\s|[,;)\]}])/g, '');
  content = content.replace(/&lt;\w+(?:<[^>]*>)?&gt;/g, '');
  
  // Clean up async arrow functions that might have type annotations
  content = content.replace(/async\s*\(\w+\s*:\s*[^)]*\)\s*=>/g, (match) => {
    return match.replace(/\s*:\s*[^)]*\)/g, ')');
  });
  
  // Remove empty import statements that might have been left after stripping types
  content = content.replace(/import\s+\{\s*\}\s+from\s+['"][^'"]*['"]/g, '');
  content = content.replace(/import\s*['"][^'"]*['"]\s*;?/g, (match) => {
    // Keep side-effect imports but remove empty ones
    return match.includes('{') ? '' : match;
  });
  
  // Clean up multiple blank lines
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  return content;
}

function processFiles() {
  const jsFiles = findJavaScriptFiles();
  console.log(`📝 Processing ${jsFiles.length} JavaScript files...\n`);
  
  let modifiedCount = 0;
  
  for (const filePath of jsFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      content = stripTypeScript(content);
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedCount++;
        console.log(`  ✓ ${path.relative(PROJECT_ROOT, filePath)}`);
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${path.relative(PROJECT_ROOT, filePath)}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Modified ${modifiedCount} files\n`);
}

try {
  processFiles();
  console.log('🎉 TypeScript syntax removal complete!');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
