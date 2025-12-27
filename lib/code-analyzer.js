import { logger } from './errors';

/**
 * Analyze code structure and detect what needs to change
 * Works with JavaScript/JSX/TypeScript
 */
export class CodeAnalyzer {
  /**
   * Extract all string literals from code
   * Useful for finding hardcoded text like "Now Playing"
   */
  extractStrings(code) {
    const strings = [];
    const patterns = [
      /"([^"\\]|\\.)*"/g,  // Double quotes
      /'([^'\\]|\\.)*'/g,  // Single quotes
      /`([^`\\]|\\.)*`/g,  // Backticks (template literals)
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        strings.push({
          value: match[0],
          text: match[0].slice(1, -1),
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    });

    return strings.sort((a, b) => a.start - b.start);
  }

  /**
   * Extract function/component definitions
   */
  extractFunctions(code) {
    const functions = [];
    const patterns = [
      /(?:function|const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?:=|\()/g,
      /export\s+(?:default\s+)?(?:function|const)\s+([a-zA-Z_$][\w$]*)/g,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        functions.push({
          name: match[1],
          start: match.index,
          type: code.slice(match.index, match.index + 20).includes('function') ? 'function' : 'const',
        });
      }
    });

    return [...new Map(functions.map(f => [f.name, f])).values()];
  }

  /**
   * Extract imports/dependencies
   */
  extractImports(code) {
    const imports = [];
    const pattern = /import\s+(?:{[^}]*}|[a-zA-Z_$][\w$]*|.*?)\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = pattern.exec(code)) !== null) {
      imports.push({
        statement: match[0],
        from: match[1],
      });
    }

    return imports;
  }

  /**
   * Extract JSX/HTML elements
   */
  extractElements(code) {
    const elements = [];
    const pattern = /<([A-Za-z][A-Za-z0-9]*)[^>]*>/g;

    let match;
    while ((match = pattern.exec(code)) !== null) {
      elements.push({
        name: match[1],
        start: match.index,
      });
    }

    return elements;
  }

  /**
   * Detect what type of change is needed
   */
  analyzeChangeType(userPrompt, codeContext) {
    const lowerPrompt = userPrompt.toLowerCase();
    const lowerContext = codeContext.toLowerCase();

    const changeTypes = {
      textReplacement: /change.*(?:text|title|label|heading|content)|replace.*(?:text|title)|from\s+["']([^"']+)["']\s+to\s+["']([^"']+)["']/i,
      styleChange: /change.*(?:style|color|size|font|background)|add.*(?:style|css)|styling|appearance/i,
      componentAddition: /add.*(?:component|button|section|feature)/i,
      componentRemoval: /remove|delete.*(?:component|button|section)/i,
      functionChange: /change.*(?:function|logic|behavior)|modify.*(?:function|code)/i,
      stateManagement: /(?:add|change).*(?:state|useState|context|redux)/i,
      apiIntegration: /(?:add|create|integrate).*(?:api|fetch|request|endpoint)/i,
    };

    const detectedTypes = [];
    for (const [type, pattern] of Object.entries(changeTypes)) {
      if (pattern.test(userPrompt)) {
        detectedTypes.push(type);
      }
    }

    return detectedTypes.length > 0 ? detectedTypes : ['functionChange'];
  }

  /**
   * Find specific text to replace
   */
  findTextReplacements(userPrompt, code) {
    const replacements = [];
    
    // Look for "from X to Y" pattern
    const fromToMatch = userPrompt.match(/(?:from|change)\s+["']([^"']+)["']\s+(?:to|with)\s+["']([^"']+)["']/i);
    if (fromToMatch) {
      const [, from, to] = fromToMatch;
      const occurrences = [];
      let index = 0;
      while ((index = code.indexOf(from, index)) !== -1) {
        occurrences.push({ from, to, index, line: code.slice(0, index).split('\n').length });
        index += from.length;
      }
      replacements.push(...occurrences);
    }

    return replacements;
  }

  /**
   * Suggest files that likely need changes based on analysis
   */
  suggestChangedFiles(userPrompt, fileAnalysis) {
    const changeTypes = this.analyzeChangeType(userPrompt, '');
    const suggestions = [];

    if (changeTypes.includes('textReplacement')) {
      // Text replacements likely in JSX/HTML files
      suggestions.push(...fileAnalysis.filter(f => f.type === 'jsx' || f.type === 'html'));
    }
    if (changeTypes.includes('styleChange')) {
      suggestions.push(...fileAnalysis.filter(f => f.type === 'css' || f.path.includes('styles')));
    }
    if (changeTypes.includes('functionChange') || changeTypes.includes('stateManagement')) {
      suggestions.push(...fileAnalysis.filter(f => f.type === 'jsx' || f.type === 'ts' || f.type === 'js'));
    }

    return [...new Map(suggestions.map(f => [f.path, f])).values()];
  }

  /**
   * Create detailed analysis report
   */
  analyzeFile(filePath, fileContent) {
    return {
      path: filePath,
      size: fileContent.length,
      lines: fileContent.split('\n').length,
      strings: this.extractStrings(fileContent),
      functions: this.extractFunctions(fileContent),
      imports: this.extractImports(fileContent),
      elements: this.extractElements(fileContent),
      type: this.detectFileType(filePath),
    };
  }

  /**
   * Detect file type/language
   */
  detectFileType(filePath) {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) return 'jsx';
    if (filePath.endsWith('.js') || filePath.endsWith('.ts')) return 'js';
    if (filePath.endsWith('.css') || filePath.endsWith('.scss') || filePath.endsWith('.sass')) return 'css';
    if (filePath.endsWith('.html')) return 'html';
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.md')) return 'markdown';
    return 'unknown';
  }
}

export const codeAnalyzer = new CodeAnalyzer();

export default CodeAnalyzer;
