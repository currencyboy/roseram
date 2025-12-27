import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const githubToken = request.headers.get('X-GitHub-Token');

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token is required' },
        { status: 401 }
      );
    }

    if (action === 'list') {
      return await listRepositories(githubToken);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in repositories API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function listRepositories(githubToken) {
  try {
    const allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member&sort=updated`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Builder.io',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid GitHub token' },
            { status: 401 }
          );
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const repos = await response.json();

      if (repos.length === 0) {
        hasMore = false;
        break;
      }

      allRepos.push(...repos);
      page++;

      if (allRepos.length >= 1000) {
        hasMore = false;
      }
    }

    const repositories = allRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      isFork: repo.fork,
      description: repo.description,
    }));

    return NextResponse.json({
      success: true,
      repositories: repositories,
    });
  } catch (error) {
    console.error('Error fetching repositories from GitHub:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, githubToken } = body;

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token is required' },
        { status: 401 }
      );
    }

    if (action === 'add') {
      return await addRepository(body, githubToken);
    } else if (action === 'remove') {
      return await removeRepository(body);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in repositories API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function addRepository(body, githubToken) {
  const { owner, repoName } = body;

  if (!owner || !repoName) {
    return NextResponse.json(
      { error: 'Owner and repository name are required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Builder.io',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found' },
          { status: 404 }
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repo = await response.json();

    const repository = {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      description: repo.description,
    };

    return NextResponse.json(
      { success: true, repository },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding repository:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add repository' },
      { status: 500 }
    );
  }
}

async function removeRepository(body) {
  return NextResponse.json(
    { success: true, message: 'Repository removed' }
  );
}
