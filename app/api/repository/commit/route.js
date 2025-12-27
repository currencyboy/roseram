import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      owner,
      repo,
      token,
      message = 'Update from ROSERAM Builder',
      branch = 'main',
      files = [],
    } = body;

    if (!owner || !repo || !token || files.length === 0) {
      return NextResponse.json(
        { error: 'owner, repo, token, and files are required' },
        { status: 400 }
      );
    }

    // Validate files array
    if (!Array.isArray(files) || files.some(f => !f.path || !f.content)) {
      return NextResponse.json(
        { error: 'files must be array with path and content properties' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    // Get the latest commit SHA for this branch
    const refResponse = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const latestCommitSha = refResponse.data.object.sha;

    // Get the tree of the latest commit
    const commitResponse = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });

    const baseTreeSha = commitResponse.data.tree.sha;

    // Create tree entries for each file
    const treeEntries = files.map(file => ({
      path: file.path,
      mode: '100644',
      type: 'blob',
      content: file.content,
    }));

    // Create new tree
    const treeResponse = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeEntries,
    });

    // Create commit
    const newCommitResponse = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: treeResponse.data.sha,
      parents: [latestCommitSha],
      author: {
        name: 'ROSERAM Builder',
        email: 'builder@roseram.io',
      },
    });

    // Update ref to point to new commit
    const updateRefResponse = await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitResponse.data.sha,
    });

    return NextResponse.json({
      success: true,
      commit: {
        sha: newCommitResponse.data.sha,
        message: newCommitResponse.data.message,
        url: newCommitResponse.data.html_url,
        filesChanged: files.length,
      },
    });
  } catch (error) {
    console.error('[Commit] Error:', error);
    
    let errorMessage = 'Failed to push changes';
    if (error.message) {
      if (error.message.includes('401')) {
        errorMessage = 'Invalid GitHub token';
      } else if (error.message.includes('404')) {
        errorMessage = 'Repository not found';
      } else if (error.message.includes('403')) {
        errorMessage = 'Permission denied - check your GitHub token permissions';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
