/**
 * Repository Inspector
 * 
 * Inspects a repository to determine its type and configuration
 * without assumptions. Looks for actual project files and config.
 */

import { logger } from './errors.js';

export class RepoInspector {
  /**
   * Inspect a repository to determine project type
   * 
   * @param {Object} files - File tree from repository (from /api/repository)
   * @returns {Object} Inspection result with detected type and metadata
   */
  static inspect(files) {
    if (!files || !Array.isArray(files)) {
      throw new Error('Files array is required');
    }

    const fileMap = new Map(files.map(f => [f.path?.toLowerCase(), f]));
    const filePaths = Array.from(fileMap.keys());

    logger.info('Inspecting repository', { fileCount: filePaths.length });

    // Detect project type by looking for key files
    const detectedType = this.detectType(fileMap, filePaths);
    const packageManager = this.detectPackageManager(fileMap, filePaths);
    const hasDockerfile = fileMap.has('dockerfile') || fileMap.has('.dockerfile');
    const hasEnvFile = fileMap.has('.env.example') || fileMap.has('.env');

    logger.info('Repository inspection complete', {
      detectedType,
      packageManager,
      hasDockerfile,
      hasEnvFile
    });

    return {
      type: detectedType,
      packageManager,
      hasDockerfile,
      hasEnvFile,
      fileCount: filePaths.length,
      files: filePaths
    };
  }

  /**
   * Detect project type by looking for key files
   */
  static detectType(fileMap, filePaths) {
    // Node.js
    if (fileMap.has('package.json')) {
      return 'node';
    }

    // Python
    if (fileMap.has('requirements.txt') || fileMap.has('pyproject.toml') || fileMap.has('setup.py')) {
      return 'python';
    }

    // Ruby
    if (fileMap.has('gemfile') || fileMap.has('gemfile.lock')) {
      return 'ruby';
    }

    // Go
    if (fileMap.has('go.mod') || fileMap.has('go.sum')) {
      return 'go';
    }

    // Java
    if (fileMap.has('pom.xml') || fileMap.has('build.gradle') || fileMap.has('build.gradle.kts')) {
      return 'java';
    }

    // PHP
    if (fileMap.has('composer.json') || fileMap.has('composer.lock')) {
      return 'php';
    }

    // Rust
    if (fileMap.has('cargo.toml') || fileMap.has('cargo.lock')) {
      return 'rust';
    }

    // Check for main file patterns
    if (this.hasMainFile(fileMap, ['main.py', 'app.py'])) {
      return 'python';
    }

    if (this.hasMainFile(fileMap, ['main.go'])) {
      return 'go';
    }

    if (this.hasMainFile(fileMap, ['main.rs', 'lib.rs'])) {
      return 'rust';
    }

    // If we can't detect, return 'other'
    return 'other';
  }

  /**
   * Detect package manager
   */
  static detectPackageManager(fileMap, filePaths) {
    // Node.js package managers
    if (fileMap.has('package-lock.json')) {
      return 'npm';
    }
    if (fileMap.has('yarn.lock')) {
      return 'yarn';
    }
    if (fileMap.has('pnpm-lock.yaml')) {
      return 'pnpm';
    }

    // Python
    if (fileMap.has('pipenv') || fileMap.has('pipfile')) {
      return 'pipenv';
    }
    if (fileMap.has('poetry.lock')) {
      return 'poetry';
    }

    return null;
  }

  /**
   * Check if any main files exist
   */
  static hasMainFile(fileMap, filenames) {
    return filenames.some(f => fileMap.has(f.toLowerCase()));
  }

  /**
   * Get recommended install command based on detection
   */
  static getInstallCommand(type, packageManager) {
    const commands = {
      node: {
        npm: 'npm install',
        yarn: 'yarn install',
        pnpm: 'pnpm install',
        default: 'npm install'
      },
      python: {
        poetry: 'poetry install',
        pipenv: 'pipenv install',
        default: 'pip install -r requirements.txt'
      },
      ruby: 'bundle install',
      go: 'go mod download',
      java: 'mvn install',
      php: 'composer install',
      rust: 'cargo build',
      other: 'echo "Please specify install command"'
    };

    if (type === 'node' && packageManager) {
      return commands.node[packageManager] || commands.node.default;
    }

    if (type === 'python' && packageManager) {
      return commands.python[packageManager] || commands.python.default;
    }

    return commands[type] || commands.other;
  }

  /**
   * Get recommended dev command based on detection
   */
  static getDevCommand(type, inspection = {}) {
    const commands = {
      node: 'npm run dev || npm run start || npm start',
      python: 'uvicorn app:app --host 0.0.0.0 --port 8000 || python -m app',
      ruby: 'rails server -b 0.0.0.0 -p 3000',
      go: 'go run main.go',
      java: 'mvn spring-boot:run',
      php: 'php -S 0.0.0.0:8000',
      rust: 'cargo run',
      other: 'echo "Please specify dev command"'
    };

    return commands[type] || commands.other;
  }

  /**
   * Get recommended port based on type
   */
  static getDefaultPort(type) {
    const ports = {
      node: 3000,
      python: 8000,
      ruby: 3000,
      go: 8080,
      java: 8080,
      php: 8000,
      rust: 8000,
      other: 8000
    };

    return ports[type] || 8000;
  }
}
