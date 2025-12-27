import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

/**
 * POST /api/github/commit
 * 
 * Auto-commit files to a specific GitHub branch
 * Used for committing Grok-generated code to forked/working branches
 * 
 * Body:
 * {
 *   token: string (GitHub PAT),
 *   owner: string,
 *   repo: string,
 *   branch: string (target branch, e.g., 'roseram-edit-xxx'),
 *   files: Array<{ path: string, content: string }>,
 *   message: string (commit message),
 * }
 */
export async function POST(request) {
  try {
    const { token, owner, repo, branch, files, message = '[Grok] Auto-generated code update' } = await request.json();

    if (!token || !owner || !repo || !branch || !files || files.length === 0) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          required: ['token', 'owner', 'repo', 'branch', 'files'],
        },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    // Validate branch exists
    let branchRef;
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      branchRef = refData;
    } catch (err) {
      if (err.status === 404) {
        return NextResponse.json(
          { error: `Branch "${branch}" not found in repository` },
          { status: 404 }
        );
      }
      throw err;
    }

    const baseCommitSha = branchRef.object.sha;

    // Get the commit object to get the tree SHA
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });

    const baseTreeSha = commitData.tree.sha;

    // Create blob objects for each file
    const blobPromises = files.map(async (file) => {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: file.content,
        encoding: 'utf-8',
      });
      return {
        path: file.path.startsWith('/') ? file.path.substring(1) : file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      };
    });

    const treeEntries = await Promise.all(blobPromises);

    // Create a new tree with the updated files
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeEntries,
    });

    // Create a new commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [baseCommitSha],
    });

    // Update the ref to point to the new commit
    const { data: updatedRef } = await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return NextResponse.json({
      success: true,
      commit: {
        sha: newCommit.sha,
        shortSha: newCommit.sha.substring(0, 7),
        message: newCommit.message,
        author: newCommit.author,
        url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
        branch,
        filesUpdated: files.length,
      },
    });
  } catch (error) {
    console.error('[GitHub Commit API] Error:', error);

    let status = 500;
    let errorMessage = 'Failed to commit to repository';

    if (error.status === 401) {
      status = 401;
      errorMessage = 'Invalid GitHub token';
    } else if (error.status === 403) {
      status = 403;
      errorMessage = 'Permission denied - you may not have write access to this repository';
    } else if (error.status === 404) {
      status = 404;
      errorMessage = 'Repository or branch not found';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.message,
      },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'GitHub commit endpoint',
    usage: 'POST to commit files to a specific branch',
  });
}
