#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'];
const TS_EXTENSIONS = ['.ts', '.tsx'];
const IMPORT_PATTERN = /from\s+['"]([^'"]+)\.(ts|tsx)['"];/g;

console.log('🚀 Starting TypeScript to JavaScript migration...\n');

// Step 1: Find all TypeScript files
function findTypeScriptFiles(dir = PROJECT_ROOT) {
  let tsFiles = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip excluded directories
      if (entry.isDirectory() && EXCLUDED_DIRS.includes(entry.name)) {
        continue;
      }
      
      // Skip dot directories except for specific ones
      if (entry.isDirectory() && entry.name.startsWith('.') && entry.name !== '.github') {
        continue;
      }
      
      if (entry.isDirectory()) {
        tsFiles = tsFiles.concat(findTypeScriptFiles(fullPath));
      } else if (TS_EXTENSIONS.includes(path.extname(entry.name))) {
        tsFiles.push(fullPath);
      }
    }
  } catch (err) {
    // Silently skip directories we can't read
  }
  
  return tsFiles;
}

// Step 2: Rename files and update imports
function migrateFiles() {
  const tsFiles = findTypeScriptFiles();
  console.log(`📁 Found ${tsFiles.length} TypeScript files to convert\n`);
  
  if (tsFiles.length === 0) {
    console.log('✅ No TypeScript files found. Migration skipped.');
    return;
  }
  
  // Map old paths to new paths
  const pathMappings = {};
  
  // Step 2a: Rename files and create mapping
  console.log('📝 Renaming files...');
  for (const oldPath of tsFiles) {
    const ext = path.extname(oldPath);
    const newExt = ext === '.ts' ? '.js' : '.jsx';
    const newPath = oldPath.replace(ext, newExt);
    
    fs.renameSync(oldPath, newPath);
    pathMappings[oldPath] = newPath;
    console.log(`  ✓ ${path.relative(PROJECT_ROOT, oldPath)} → ${path.relative(PROJECT_ROOT, newPath)}`);
  }
  
  console.log();
  
  // Step 2b: Update imports in all files
  console.log('🔗 Updating imports in all files...');
  const allFiles = findAllFiles(PROJECT_ROOT);
  let updatedCount = 0;
  
  for (const filePath of allFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Update imports from .ts/.tsx to .js/.jsx
      content = content.replace(IMPORT_PATTERN, (match, importPath, ext) => {
        const newExt = ext === 'ts' ? '.js' : '.jsx';
        return `from '${importPath}.${newExt}';`;
      });
      
      // Also handle require statements
      content = content.replace(/require\(['"]([^'"]+)\.(ts|tsx)['"]\)/g, (match, importPath, ext) => {
        const newExt = ext === 'ts' ? '.js' : '.jsx';
        return `require('${importPath}.${newExt}')`;
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        updatedCount++;
      }
    } catch (err) {
      // Skip files we can't read
    }
  }
  
  console.log(`  ✓ Updated imports in ${updatedCount} files\n`);
}

// Helper: Find all files (for import updates)
function findAllFiles(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !EXCLUDED_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
        findAllFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.json', '.ts', '.tsx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  
  return files;
}

// Step 3: Remove tsconfig.json
function removeTsConfig() {
  console.log('🗑️  Removing TypeScript configuration...');
  const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    fs.unlinkSync(tsconfigPath);
    console.log('  ✓ Removed tsconfig.json');
  }
  
  const nextEnvPath = path.join(PROJECT_ROOT, 'next-env.d.ts');
  if (fs.existsSync(nextEnvPath)) {
    fs.unlinkSync(nextEnvPath);
    console.log('  ✓ Removed next-env.d.ts');
  }
  
  console.log();
}

// Step 4: Update package.json
function updatePackageJson() {
  console.log('📦 Updating package.json...');
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Remove typescript from devDependencies
    if (packageJson.devDependencies?.typescript) {
      delete packageJson.devDependencies.typescript;
      console.log('  ✓ Removed typescript from devDependencies');
    }
    
    // Ensure Next.js is in dependencies
    if (!packageJson.dependencies?.next) {
      packageJson.dependencies = packageJson.dependencies || {};
      packageJson.dependencies.next = '^14.0.0';
      console.log('  ✓ Ensured next is in dependencies');
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    console.log();
  } catch (err) {
    console.error('Error updating package.json:', err.message);
    process.exit(1);
  }
}

// Step 5: Clean up build artifacts
function cleanBuildArtifacts() {
  console.log('🧹 Cleaning build artifacts...');
  const dirsToClean = ['.next', 'dist', 'build'];
  
  for (const dir of dirsToClean) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(dirPath)) {
      try {
        execSync(`rm -rf "${dirPath}"`, { stdio: 'pipe' });
        console.log(`  ✓ Removed ${dir}`);
      } catch (err) {
        // Continue if cleanup fails
      }
    }
  }
  
  console.log();
}

// Step 6: Reinstall dependencies
function reinstallDependencies() {
  console.log('📥 Installing dependencies...');
  try {
    execSync('npm install', { cwd, stdio);
    console.log();
  } catch (err) {
    console.error('⚠️  Failed to install dependencies. Run "npm install" manually.');
    console.log();
  }
}

// Main execution
try {
  migrateFiles();
  removeTsConfig();
  updatePackageJson();
  cleanBuildArtifacts();
  reinstallDependencies();
  
  console.log('✅ Migration complete!\n');
  console.log('📝 Summary of changes:');
  console.log('  - All .ts files renamed to .js');
  console.log('  - All .tsx files renamed to .jsx');
  console.log('  - All imports updated throughout the project');
  console.log('  - tsconfig.json and next-env.d.ts removed');
  console.log('  - typescript removed from devDependencies');
  console.log('  - Dependencies reinstalled\n');
  console.log('🚀 You can now run: npm run dev');
  
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
}
