/**
 * Preview Config Generator
 * 
 * Generates a .roseram/preview.json contract for a repository
 * based on inspection and defaults.
 */

import { RepoInspector } from './repo-inspector.js';
import { createDefaultContract, validateContract } from './preview-contract.js';
import { logger } from './errors.js';

export class PreviewConfigGenerator {
  /**
   * Generate a preview config for a repository
   * 
   * @param {Object} inspection - Result from RepoInspector.inspect()
   * @param {Object} options - Override options
   * @returns {Object} Preview contract
   */
  static generate(inspection, options = {}) {
    if (!inspection || !inspection.type) {
      throw new Error('Inspection result with type is required');
    }

    const type = inspection.type;
    logger.info('Generating preview config', { type });

    // Start with base contract for this type
    let contract = createDefaultContract(type, {
      env: {
        NODE_ENV: 'development',
        ...options.env
      }
    });

    // Override with provided options
    if (options.install) contract.install = options.install;
    if (options.dev) contract.dev = options.dev;
    if (options.port) contract.port = options.port;
    if (options.build) contract.build = options.build;

    // Use detected package manager recommendations
    if (inspection.packageManager) {
      contract.install = RepoInspector.getInstallCommand(type, inspection.packageManager);
    }

    // Validate before returning
    try {
      validateContract(contract);
    } catch (error) {
      logger.error('Generated contract is invalid', { error: error.message });
      throw error;
    }

    logger.info('Preview config generated successfully', {
      type,
      port: contract.port,
      install: contract.install,
      dev: contract.dev
    });

    return contract;
  }

  /**
   * Generate a preview config from files directly
   * 
   * @param {Array} files - File tree from repository
   * @param {Object} options - Override options
   * @returns {Object} Preview contract
   */
  static generateFromFiles(files, options = {}) {
    const inspection = RepoInspector.inspect(files);
    return this.generate(inspection, options);
  }

  /**
   * Generate the .roseram/preview.json content as a string
   */
  static generateJson(inspection, options = {}) {
    const contract = this.generate(inspection, options);
    return JSON.stringify(contract, null, 2);
  }

  /**
   * Create a JSON structure for committing to git
   */
  static createCommitObject(inspection, options = {}) {
    const contract = this.generate(inspection, options);
    const content = JSON.stringify(contract, null, 2);

    return {
      path: '.roseram/preview.json',
      content: content,
      contract: contract
    };
  }
}
