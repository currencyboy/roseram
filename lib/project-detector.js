/**
 * Project Type Detector
 * 
 * Inspects a repository to determine its type and how to run it
 * without making assumptions.
 */

import { Octokit } from 'octokit';

export async function detectProjectType(owner, repo, branch, token) {
  try {
    const octokit = new Octokit({ auth: token });

    // Check for various file signatures
    const checks = [
      { file: 'package.json', type: 'node' },
      { file: 'requirements.txt', type: 'python' },
      { file: 'pyproject.toml', type: 'python' },
      { file: 'Pipfile', type: 'python' },
      { file: 'Gemfile', type: 'ruby' },
      { file: 'go.mod', type: 'go' },
      { file: 'Cargo.toml', type: 'rust' },
      { file: 'pom.xml', type: 'java' },
      { file: 'build.gradle', type: 'java' },
      { file: 'composer.json', type: 'php' },
      { file: 'Dockerfile', type: 'docker' },
      { file: 'docker-compose.yml', type: 'docker' },
      { file: 'Makefile', type: 'makefile' },
    ];

    const detectedFiles = [];

    for (const { file, type } of checks) {
      try {
        await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file,
          ref: branch,
        });
        detectedFiles.push({ file, type, priority: getPriority(type) });
      } catch (err) {
        // File doesn't exist, continue
      }
    }

    // Sort by priority and return the most important one
    detectedFiles.sort((a, b) => b.priority - a.priority);

    if (detectedFiles.length === 0) {
      return {
        type: 'unknown',
        files: [],
        recommendation: 'Unable to detect project type. Please check the repository structure.',
      };
    }

    return {
      type: detectedFiles[0].type,
      files: detectedFiles.map(f => f.file),
      primary: detectedFiles[0].file,
    };
  } catch (error) {
    return {
      type: 'unknown',
      error: error.message,
      recommendation: 'Error detecting project type. Please check repository access.',
    };
  }
}

function getPriority(type) {
  // Priority order - what's most likely to be the "real" project type
  const priorities = {
    package: 100, // package.json is a strong signal
    docker: 90, // Docker is definitive
    node: 85,
    python: 80,
    go: 75,
    ruby: 70,
    rust: 65,
    java: 60,
    php: 50,
    makefile: 40,
    unknown: 0,
  };
  return priorities[type] || 0;
}

export async function detectPackageJson(owner, repo, branch, token) {
  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'package.json',
      ref: branch,
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

export async function getProjectStructure(owner, repo, branch, token, depth = 2) {
  try {
    const octokit = new Octokit({ auth: token });
    const structure = {};

    // Check for key directories
    const dirs = ['src', 'frontend', 'backend', 'client', 'server', 'api', 'app', 'public'];

    for (const dir of dirs) {
      try {
        const contents = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: dir,
          ref: branch,
        });

        if (Array.isArray(contents.data)) {
          structure[dir] = contents.data.map(item => ({
            name: item.name,
            type: item.type,
            path: item.path,
          }));
        }
      } catch (err) {
        // Directory doesn't exist
      }
    }

    return structure;
  } catch (error) {
    return null;
  }
}
