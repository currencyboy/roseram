import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const { owner, repo, baseBranch = 'main', token, branchName: customBranchName } = await request.json();

    if (!owner || !repo || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: owner, repo, token' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    // Use custom branch name or generate a unique one
    let branchName;
    if (customBranchName) {
      branchName = customBranchName;
    } else {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      branchName = `roseram-edit-${timestamp}-${random}`;
    }

    try {
      // Get the SHA of the base branch
      const { data: baseRef } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });

      const baseSha = baseRef.object.sha;

      // Create new branch from the base branch
      const { data: newBranch } = await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });

      return NextResponse.json({
        success: true,
        branch: branchName,
        sha: baseSha,
        ref: newBranch.ref,
        url: `https://github.com/${owner}/${repo}/tree/${branchName}`,
      });
    } catch (githubError) {
      console.error('GitHub API error:', githubError);

      // Handle permission errors
      if (githubError.status === 403) {
        const message = githubError.message || '';
        const responseMessage = githubError.response?.data?.message || '';

        if (message.includes('Resource not accessible') || responseMessage.includes('Resource not accessible')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Your GitHub token does not have permission to create branches',
              isPermissionError: true,
              fix: 'Generate a new personal access token with "repo" scope (full control of private repositories)',
              fixUrl: 'https://github.com/settings/tokens',
              details: 'The token lacks the necessary permissions to create references/branches in this repository.'
            },
            { status: 403 }
          );
        }

        // Generic 403 error
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Unable to create branch in this repository',
            isPermissionError: true,
            details: responseMessage || 'Check that your token has permission to this repository.'
          },
          { status: 403 }
        );
      }

      // Handle authentication errors
      if (githubError.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'GitHub authentication failed',
            isAuthError: true,
            details: 'Your GitHub token is invalid or expired. Please generate a new one.'
          },
          { status: 401 }
        );
      }

      // Handle not found errors
      if (githubError.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'Repository or branch not found',
            details: `The repository or base branch does not exist or is not accessible with your token.`
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: githubError.message || 'Failed to create branch on GitHub',
          details: githubError.response?.data?.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create branch' },
      { status: 500 }
    );
  }
}
