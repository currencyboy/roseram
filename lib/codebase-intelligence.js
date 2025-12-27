/**
 * Determine the programming language based on file extension
 */
export function detectLanguage(filePath) {
  const extension = filePath.split('.').pop()?.toLowerCase();

  const languageMap = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'html': 'html',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
  };

  return languageMap[extension || ''] || 'text';
}

/**
 * Build comprehensive context string from codebase analysis
 */
export function buildCodebaseContextString(analysis) {
  if (!analysis) {
    return '';
  }

  const lines = [];

  if (analysis.projectStructure) {
    lines.push('## Project Structure Overview');
    lines.push(analysis.projectStructure);
  }

  if (analysis.techStack && Array.isArray(analysis.techStack)) {
    lines.push('\n## Technology Stack');
    lines.push(analysis.techStack.join(', ') || 'Not detected');
  }

  if (analysis.frameworks && Array.isArray(analysis.frameworks)) {
    lines.push('\n## Detected Frameworks');
    lines.push(analysis.frameworks.join(', ') || 'Not detected');
  }

  if (analysis.dependencies && Array.isArray(analysis.dependencies)) {
    lines.push('\n## Detected Dependencies');
    lines.push(analysis.dependencies.join(', ') || 'Not detected');
  }

  if (analysis.conventions && Array.isArray(analysis.conventions)) {
    lines.push('\n## Detected Conventions');
    analysis.conventions.forEach(convention => {
      lines.push(`- ${convention}`);
    });
  }

  if (analysis.keyFiles && Array.isArray(analysis.keyFiles)) {
    lines.push('\n## Key Files');
    analysis.keyFiles.forEach(file => {
      lines.push(`- ${file}`);
    });
  }

  if (analysis.filePatterns && Object.keys(analysis.filePatterns).length > 0) {
    lines.push('\n## File Organization Patterns');
    Object.entries(analysis.filePatterns).forEach(([pattern, files]) => {
      if (files && Array.isArray(files) && files.length > 0) {
        lines.push(`\n### ${pattern}`);
        files.forEach(file => {
          lines.push(`- ${file}`);
        });
      }
    });
  }

  return lines.join('\n');
}

/**
 * Suggest related files based on current file being edited
 */
export function suggestRelatedFiles(filePath, allFiles, analysis) {
  const suggestions = new Set();

  const dir = filePath.split('/').slice(0, -1).join('/');
  const fileName = filePath.split('/').pop()?.split('.')[0] || '';

  if (allFiles && Array.isArray(allFiles)) {
    const filesInDir = allFiles.filter(f => f.startsWith(dir + '/'));
    filesInDir.slice(0, 5).forEach(f => suggestions.add(f));

    const similarNamed = allFiles.filter(
      f => f.split('/').pop()?.split('.')[0] === fileName && f !== filePath
    );
    similarNamed.forEach(f => suggestions.add(f));
  }

  if (analysis && analysis.keyFiles) {
    analysis.keyFiles.slice(0, 3).forEach(f => suggestions.add(f));
  }

  return Array.from(suggestions).slice(0, 10);
}
