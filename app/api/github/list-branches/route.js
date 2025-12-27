import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const { owner, repo, token } = await request.json();

    if (!owner || !repo || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: owner, repo, token' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    try {
      // List all branches in the repository
      const { data: branches } = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      // Filter branches that match the roseram pattern
      const roseramBranches = branches.filter(branch => 
        branch.name.startsWith('roseram-edit-')
      );

      // Sort by date (most recent first) by extracting timestamp from branch name
      const sortedBranches = roseramBranches.sort((a, b) => {
        const aTimestamp = parseInt(a.name.split('-')[2]) || 0;
        const bTimestamp = parseInt(b.name.split('-')[2]) || 0;
        return bTimestamp - aTimestamp;
      });

      console.log(`[ListBranches] Found ${sortedBranches.length} roseram branches for ${owner}/${repo}`);

      return NextResponse.json({
        success: true,
        branches: sortedBranches.map(branch => ({
          name: branch.name,
          commit: branch.commit?.sha || '',
          protected: branch.protected,
          url: `https://github.com/${owner}/${repo}/tree/${branch.name}`,
        })),
        count: sortedBranches.length,
      });
    } catch (githubError) {
      console.error('GitHub API error:', githubError);
      
      // If 404, repo doesn't exist or user doesn't have access
      if (githubError.status === 404) {
        return NextResponse.json({
          success: true,
          branches: [],
          count: 0,
          message: 'Repository not found or not accessible',
        });
      }

      return NextResponse.json(
        { 
          success: false, 
          error: githubError.message || 'Failed to list branches',
          details: githubError.response?.data?.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error listing branches:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list branches' },
      { status: 500 }
    );
  }
}
