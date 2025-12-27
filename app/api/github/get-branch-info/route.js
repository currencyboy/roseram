import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const { owner, repo, branch, token } = await request.json();

    if (!owner || !repo || !branch || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: owner, repo, branch, token' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    try {
      // Get the branch reference
      const { data: branchData } = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch,
      });

      console.log(`[GetBranchInfo] Retrieved info for branch: ${owner}/${repo}/${branch}`);

      return NextResponse.json({
        success: true,
        branch: {
          name: branchData.name,
          sha: branchData.commit?.sha || '',
          protected: branchData.protected,
          url: `https://github.com/${owner}/${repo}/tree/${branchData.name}`,
        },
      });
    } catch (githubError) {
      console.error('GitHub API error:', githubError);

      if (githubError.status === 404) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Branch not found',
            details: 'The branch may have been deleted'
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: githubError.message || 'Failed to get branch info',
          details: githubError.response?.data?.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error getting branch info:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get branch info' },
      { status: 500 }
    );
  }
}
