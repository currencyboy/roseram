import { logger } from './errors';

/**
 * Simple semantic search based on keyword matching
 * Finds files most relevant to user's request
 */
export class SemanticFileSearch {
  constructor() {
    this.fileCache = new Map();
  }

  /**
   * Extract keywords from user prompt
   */
  extractKeywords(prompt) {
    const keywords = prompt
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    return [...new Set(keywords)];
  }

  /**
   * Common words to ignore in search
   */
  isStopWord(word) {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'be', 'was', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    ];
    return stopWords.includes(word);
  }

  /**
   * Calculate similarity score between query and file
   */
  calculateSimilarity(keywords, filePath, fileContent = '') {
    const lowerPath = filePath.toLowerCase();
    const lowerContent = fileContent.toLowerCase();
    
    let score = 0;

    // Path matches are weighted heavily
    keywords.forEach(keyword => {
      if (lowerPath.includes(keyword)) score += 10;
      if (lowerContent.includes(keyword)) score += 1;
    });

    // File type matching
    if (keywords.some(k => k === 'style' || k === 'css')) {
      if (filePath.endsWith('.css') || filePath.endsWith('.scss')) score += 5;
    }
    if (keywords.some(k => k === 'button' || k === 'component')) {
      if (filePath.includes('component')) score += 5;
    }

    return score;
  }

  /**
   * Find most relevant files
   */
  findRelevantFiles(userPrompt, files, fileContents = {}, topN = 5) {
    const keywords = this.extractKeywords(userPrompt);
    
    if (keywords.length === 0) {
      // No specific keywords - return most common file types
      return files
        .filter(f => !f.startsWith('.') && !f.includes('node_modules'))
        .slice(0, topN);
    }

    const scored = files
      .filter(f => !f.startsWith('.') && !f.includes('node_modules'))
      .map(file => ({
        file,
        score: this.calculateSimilarity(keywords, file, fileContents[file] || ''),
      }))
      .sort((a, b) => b.score - a.score);

    return scored.filter(item => item.score > 0).slice(0, topN).map(item => item.file);
  }

  /**
   * Categorize files by type
   */
  categorizeFiles(files) {
    const categories = {
      components: [],
      styles: [],
      config: [],
      pages: [],
      utils: [],
      api: [],
      other: [],
    };

    files.forEach(file => {
      if (file.includes('component')) categories.components.push(file);
      else if (file.endsWith('.css') || file.endsWith('.scss') || file.endsWith('.sass')) categories.styles.push(file);
      else if (file.match(/config|\.config\./)) categories.config.push(file);
      else if (file.includes('page')) categories.pages.push(file);
      else if (file.includes('utils') || file.includes('lib') || file.includes('helper')) categories.utils.push(file);
      else if (file.includes('api')) categories.api.push(file);
      else categories.other.push(file);
    });

    return categories;
  }

  /**
   * Get context snippet from file for analysis
   */
  getFileContext(filePath, fileContent, maxLines = 10) {
    if (!fileContent) return '';
    
    const lines = fileContent.split('\n');
    return lines.slice(0, maxLines).join('\n') + (lines.length > maxLines ? '\n...' : '');
  }
}

export const semanticSearch = new SemanticFileSearch();

export default SemanticFileSearch;
