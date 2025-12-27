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
      // List all branches in the repository (paginated)
      const branches = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data: pageBranches } = await octokit.rest.repos.listBranches({
          owner,
          repo,
          per_page: 100,
          page,
        });

        if (pageBranches.length === 0) {
          hasMore = false;
        } else {
          branches.push(...pageBranches);
          page++;
        }
      }

      console.log(`[ListAllBranches] Found ${branches.length} total branches for ${owner}/${repo}`);

      // Separate into roseram branches and other branches
      const roseramBranches = branches.filter(branch => 
        branch.name.startsWith('roseram-edit-')
      );

      const otherBranches = branches.filter(branch => 
        !branch.name.startsWith('roseram-edit-')
      );

      // Sort roseram branches by timestamp (most recent first)
      const sortedRoseramBranches = roseramBranches.sort((a, b) => {
        const aTimestamp = parseInt(a.name.split('-')[2]) || 0;
        const bTimestamp = parseInt(b.name.split('-')[2]) || 0;
        return bTimestamp - aTimestamp;
      });

      return NextResponse.json({
        success: true,
        branches: [
          ...sortedRoseramBranches.map(branch => ({
            name: branch.name,
            commit: branch.commit?.sha || '',
            protected: branch.protected,
            url: `https://github.com/${owner}/${repo}/tree/${branch.name}`,
            type: 'roseram',
            default: false,
          })),
          ...otherBranches.map(branch => ({
            name: branch.name,
            commit: branch.commit?.sha || '',
            protected: branch.protected,
            url: `https://github.com/${owner}/${repo}/tree/${branch.name}`,
            type: 'regular',
            default: branch.name === branches.find(b => b.name === branch.name)?.name,
          })),
        ],
        roseramCount: sortedRoseramBranches.length,
        totalCount: branches.length,
      });
    } catch (githubError) {
      console.error('GitHub API error:', githubError);
      
      if (githubError.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Repository not found or not accessible',
        }, { status: 404 });
      }

      if (githubError.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Authentication failed. Invalid or expired token.',
        }, { status: 401 });
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
