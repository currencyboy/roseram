#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'];

console.log('🔄 Converting TypeScript to proper JavaScript...\n');

function findFiles(dir = PROJECT_ROOT, pattern = /\.(ts|tsx|js|jsx)$/) {
  let files = [];
  
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
        files = files.concat(findFiles(fullPath, pattern));
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Silently skip
  }
  
  return files;
}

function convertTypeScriptToJavaScript(content) {
  // Step 1: Remove import type and ?/g, '');
  content = content.replace(/export\s+type\s+\w+[^;]*;/g, '');
  
  // Step 2: Remove interface declarations
  content = content.replace(/^\s*(export\s+)?interface\s+\w+.*?\{([^}]|\n)*?\}\s*$/gm, '');
  
  // Step 3: Remove enum declarations  
  content = content.replace(/^\s*(export\s+)?enum\s+\w+.*?\{([^}]|\n)*?\}\s*$/gm, '');
  
  // Step 4: Remove type parameters from function declarations
  // function getName() -> function getName()
  content = content.replace(/(\bfunction\s+\w+)\s*<[^>]+>/g, '$1');
  content = content.replace(/(\basync\s+function\s+\w+)\s*<[^>]+>/g, '$1');
  
  // Step 5: Remove parameter type annotations
  // (param) -> (param)
  // This is the most complex part - we need to preserve commas and closing parens
  content = content.replace(/:\s*(?:React\.ReactNode|NextRequest|NextResponse|Array<[^>]+>|Record<[^>]+>|Promise<[^>]+>|\w+(?:<[^>]+>)?)\s*(?=[,\)\]=>])/g, '');
  
  // Step 6: Remove return type annotations
  // ) { -> ) {
  content = content.replace(/\)\s*:\s*(?:React\.ReactNode|JSX\.Element|void|string|number|boolean|any|Promise<[^>]+>|[A-Z]\w+(?:<[^>]+>)?)\s*\{/g, ') {');
  
  // Step 7: Remove async function return types
  // async ()=> -> async () =>
  content = content.replace(/async\s*\([^)]*\)\s*:\s*Promise<[^>]+>\s*=>/g, (match) => {
    return match.replace(/\s*:\s*Promise<[^>]+>/, '');
  });
  
  // Step 8: Remove 'as' type assertions
  // value -> value
  content = content.replace(/\s+as\s+(?:\w+(?:<[^>]+>)?|keyof\s+\w+)/g, '');
  
  // Step 9: Remove generic constraints from variables
  // const x= value -> const x = value
  content = content.replace(/:\s*\w+(?:<[^>]+>)?\s*=/g, ' =');
  
  // Step 10: Clean up type definitions in class/object literals
  // Remove : Type from simple property declarations but preserve object literals
  content = content.replace(/(\w+)\s*:\s*(?!{)(?:string|number|boolean|any|undefined|null)\s*[,;=\n]/g, '$1$2');
  
  // Step 11: Remove JSDoc @ts-ignore and similar directives
  content = content.replace(/\/\/\s*@ts-ignore\n/g, '');
  content = content.replace(/\/\*\s*@ts-[^*]*\*\//g, '');
  
  // Step 12: Fix generic types in variable declarations that weren't caught
  // useState() -> useState()
  content = content.replace(/(\w+)\s*<[^>]+>\s*\(/g, '$1(');
  
  // Step 13: Remove @type comments
  content = content.replace(/\/\*\*\s*@type\s+[^*]*\*\*\//g, '');
  
  // Step 14: Clean up double/triple blank lines
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  // Step 15: Remove trailing blank import lines
  content = content.replace(/^import\s+\{\s*\}\s+from\s+['"][^'"]*['"]\s*;?$/gm, '');
  
  return content;
}

function processFiles() {
  const tsFiles = findFiles().filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
  console.log(`📝 Processing ${tsFiles.length} files...\n`);
  
  let convertedCount = 0;
  let renamedCount = 0;
  
  for (const filePath of tsFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const converted = convertTypeScriptToJavaScript(content);
      
      if (content !== converted) {
        fs.writeFileSync(filePath, converted, 'utf8');
        convertedCount++;
      }
      
      // Rename .ts to .js and .tsx to .jsx
      const ext = path.extname(filePath);
      if (ext === '.ts' || ext === '.tsx') {
        const newExt = ext === '.ts' ? '.js' : '.jsx';
        const newPath = filePath.replace(/\.(ts|tsx)$/, newExt);
        
        if (filePath !== newPath) {
          fs.renameSync(filePath, newPath);
          renamedCount++;
          console.log(`  ✓ ${path.relative(PROJECT_ROOT, filePath)} → ${path.relative(PROJECT_ROOT, newPath)}`);
        }
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${path.relative(PROJECT_ROOT, filePath)}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Converted ${convertedCount} files (removed TypeScript syntax)`);
  console.log(`✅ Renamed ${renamedCount} files (.ts → .js, .tsx → .jsx)\n`);
}

try {
  processFiles();
  console.log('🎉 TypeScript to JavaScript conversion complete!');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
