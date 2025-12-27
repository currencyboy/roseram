import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const { token, owner, repo } = await request.json();

    if (!token || !owner || !repo) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: token, owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    // Validate repository exists and is accessible
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    // Check if repository is public
    if (repoData.private) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Repository is private',
        details: 'StackBlitz only supports public repositories. Please make this repository public or use a public fork.',
        repository: {
          name: repoData.name,
          owner: repoData.owner.login,
          isPrivate: true,
          url: repoData.html_url,
        },
      });
    }

    // Check if repository has essential files
    const essentialFiles = ['package.json', 'README.md'];
    const fileChecks = await Promise.all(
      essentialFiles.map(async (file) => {
        try {
          await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file,
          });
          return { file, exists: true };
        } catch {
          return { file, exists: false };
        }
      })
    );

    const hasPackageJson = fileChecks.find(f => f.file === 'package.json')?.exists;
    const warnings = fileChecks.filter(f => !f.exists).map(f => `Missing ${f.file}`);

    if (!hasPackageJson) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Repository does not appear to be a valid JavaScript/Node.js project',
        details: 'Could not find package.json in the repository root. StackBlitz requires a valid package.json file.',
        repository: {
          name: repoData.name,
          owner: repoData.owner.login,
          url: repoData.html_url,
          fileChecks,
        },
      });
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      valid: true,
      repository: {
        name: repoData.name,
        owner: repoData.owner.login,
        url: repoData.html_url,
        defaultBranch: repoData.default_branch,
        isPrivate: repoData.private,
        isPublic: !repoData.private,
        hasPackageJson: true,
        warnings: warnings.length > 0 ? warnings : null,
        fileChecks,
      },
      message: 'Repository is valid and ready to be forked and embedded',
    });
  } catch (error) {
    console.error('Repository validation error:', error);

    let status = 500;
    let message = 'Failed to validate repository';
    let details = error.message;

    if (error.status === 401) {
      status = 401;
      message = 'Invalid GitHub token';
    } else if (error.status === 403) {
      status = 403;
      message = 'Permission denied - check your GitHub token permissions';
    } else if (error.status === 404) {
      status = 404;
      message = 'Repository not found';
      details = 'Make sure the repository owner and name are correct';
    }

    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: message,
        details,
      },
      { status }
    );
  }
}
