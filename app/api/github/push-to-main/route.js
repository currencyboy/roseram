import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const { token, owner, repo, files, message = 'Updated with ROSERAM' } = await request.json();

    if (!token || !owner || !repo || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: token, owner, repo, files' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    // Get repository info
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    const defaultBranch = repoData.default_branch || 'main';

    // Get the latest commit SHA on the main branch
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });

    const baseCommitSha = refData.object.sha;

    // Get the commit object to get the tree SHA
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });

    const baseTreeSha = commitData.tree.sha;

    // Create blob objects for each file and collect them
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
      ref: `heads/${defaultBranch}`,
      sha: newCommit.sha,
    });

    return NextResponse.json({
      success: true,
      commit: {
        sha: newCommit.sha,
        message: newCommit.message,
        author: newCommit.author,
        url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
        branch: defaultBranch,
        filesUpdated: files.length,
      },
    });
  } catch (error) {
    console.error('Push to main error:', error);

    let status = 500;
    let message = 'Failed to push to repository';

    if (error.status === 401) {
      status = 401;
      message = 'Invalid GitHub token';
    } else if (error.status === 403) {
      status = 403;
      message = 'Permission denied - you may not have write access to this repository';
    } else if (error.status === 404) {
      status = 404;
      message = 'Repository or branch not found';
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        details: error.message,
      },
      { status }
    );
  }
}
