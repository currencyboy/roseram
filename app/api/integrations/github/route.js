import { NextResponse } from 'next/server';

async function fetchAllRepositoriesGraphQL(token) {
  const allRepos = [];
  let hasNextPage = true;
  let cursor = null;
  let pageCount = 0;

  console.log('[GitHub GraphQL API] Starting repository fetch');

  while (hasNextPage && pageCount < 100) { // Max 100 pages
    pageCount++;

    const query = `
      query($first: Int!, $after: String) {
        viewer {
          repositories(first: 100, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              name
              nameWithOwner
              url
              description
              isPrivate
              isFork
              defaultBranchRef {
                name
              }
              languages(first: 1) {
                nodes {
                  name
                }
              }
              stargazerCount
              updatedAt
            }
          }
        }
      }
    `;

    try {
      console.log(`[GitHub GraphQL] Fetching page ${pageCount}, cursor: ${cursor ? cursor.substring(0, 20) + '...' : 'null'}`);

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'RoseramBuilder/1.0',
        },
        body: JSON.stringify({
          query,
          variables: {
            first: 100,
            after: cursor,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GitHub GraphQL] HTTP ${response.status}:`, errorText.substring(0, 200));

        if (response.status === 401) {
          throw new Error('401 Unauthorized: Invalid GitHub token');
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.map(e => e.message).join('; ');
        console.error('[GitHub GraphQL] GraphQL error:', errorMsg);
        throw new Error(`GraphQL error: ${errorMsg}`);
      }

      if (!result.data?.viewer?.repositories) {
        console.error('[GitHub GraphQL] Invalid response structure:', JSON.stringify(result).substring(0, 200));
        throw new Error('Invalid response structure from GitHub GraphQL');
      }

      const { nodes, pageInfo } = result.data.viewer.repositories;

      console.log(`[GitHub GraphQL] Page ${pageCount}: fetched ${nodes.length} repositories`);

      // Convert GraphQL nodes to REST-like format
      nodes.forEach(repo => {
        if (repo && repo.id) {
          allRepos.push({
            id: repo.id,
            name: repo.name,
            full_name: repo.nameWithOwner,
            owner: repo.nameWithOwner.split('/')[0],
            html_url: repo.url,
            description: repo.description,
            private: repo.isPrivate,
            fork: repo.isFork,
            default_branch: repo.defaultBranchRef?.name || 'main',
            language: repo.languages?.nodes?.[0]?.name || null,
            stargazers_count: repo.stargazerCount,
            updated_at: repo.updatedAt,
          });
        }
      });

      console.log(`[GitHub GraphQL] Total collected so far: ${allRepos.length}`);

      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

    } catch (error) {
      console.error(`[GitHub GraphQL] Error on page ${pageCount}:`, error.message);

      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw error;
      }

      // If we got some repos, return them even if there's an error
      if (allRepos.length > 0) {
        console.log('[GitHub GraphQL] Partial success - returning collected repos');
        hasNextPage = false;
      } else {
        throw error;
      }
    }
  }

  console.log(`[GitHub GraphQL] Final total repositories: ${allRepos.length}`);

  if (allRepos.length === 0) {
    throw new Error('No repositories found. Your token may not have access to any repositories.');
  }

  return allRepos;
}

async function fetchAllRepositoriesREST(token) {
  const allRepos = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  console.log('[GitHub REST API] Starting repository fetch');

  while (hasMore && allRepos.length < 10000) {
    try {
      const url = `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&type=all&sort=updated`;

      console.log(`[GitHub REST] Fetching page ${page}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RoseramBuilder/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GitHub REST] HTTP ${response.status}:`, errorText.substring(0, 200));

        if (response.status === 401) {
          throw new Error('401 Unauthorized: Invalid GitHub token');
        }

        throw new Error(`HTTP ${response.status}`);
      }

      const repos = await response.json();

      if (!Array.isArray(repos)) {
        throw new Error('Invalid response format');
      }

      console.log(`[GitHub REST] Page ${page}: got ${repos.length} repositories`);

      if (repos.length === 0) {
        hasMore = false;
      } else {
        allRepos.push(...repos);
        page++;
      }

    } catch (error) {
      console.error(`[GitHub REST] Error on page ${page}:`, error.message);
      throw error;
    }
  }

  console.log(`[GitHub REST] Total repositories: ${allRepos.length}`);

  if (allRepos.length === 0) {
    throw new Error('No repositories found');
  }

  return allRepos.map(repo => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: repo.owner?.login || 'unknown',
    html_url: repo.html_url,
    description: repo.description,
    private: repo.private,
    fork: repo.fork,
    default_branch: repo.default_branch,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    updated_at: repo.updated_at,
  }));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, token } = body;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'GitHub token is required',
        repositories: [],
      }, { status: 400 });
    }

    if (action === 'get-repos') {
      try {
        // Try GraphQL first (more reliable), fallback to REST
        let repos;
        try {
          repos = await fetchAllRepositoriesGraphQL(token);
        } catch (graphqlError) {
          console.log('[GitHub API] GraphQL failed, trying REST API:', graphqlError.message);
          repos = await fetchAllRepositoriesREST(token);
        }

        console.log(`[GitHub API] Returning ${repos.length} repositories`);

        return NextResponse.json({
          success: true,
          repositories: repos,
          totalCount: repos.length,
        });
      } catch (error) {
        const message = error.message || 'Failed to fetch repositories';
        console.error('[GitHub API] get-repos failed:', message);

        return NextResponse.json({
          success: false,
          error: message,
          repositories: [],
        }, { status: error.message?.includes('401') ? 401 : 500 });
      }
    }

    if (action === 'validate-token') {
      try {
        const response = await fetch('https://api.github.com/user', {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RoseramBuilder/1.0',
          },
        });

        if (!response.ok) {
          return NextResponse.json({
            success: false,
            valid: false,
            error: `Token validation failed`,
          });
        }

        const user = await response.json();

        return NextResponse.json({
          success: true,
          valid: true,
          user: { login: user.login, id: user.id },
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: error.message,
        });
      }
    }

    if (action === 'get-user') {
      try {
        const response = await fetch('https://api.github.com/user', {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RoseramBuilder/1.0',
          },
        });

        if (!response.ok) {
          return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: response.status });
        }

        const user = await response.json();

        return NextResponse.json({
          success: true,
          user: {
            login: user.login,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            id: user.id,
          },
        });
      } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    if (action === 'get-repo-details') {
      try {
        const { owner, repo } = body;

        if (!owner || !repo) {
          return NextResponse.json(
            { success: false, error: 'Owner and repo parameters are required' },
            { status: 400 }
          );
        }

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RoseramBuilder/1.0',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return NextResponse.json(
              { success: false, error: `Repository ${owner}/${repo} not found` },
              { status: 404 }
            );
          }
          return NextResponse.json(
            { success: false, error: `Failed to fetch repository details (${response.status})` },
            { status: response.status }
          );
        }

        const repository = await response.json();

        return NextResponse.json({
          success: true,
          repository: {
            id: repository.id,
            name: repository.name,
            full_name: repository.full_name,
            owner: {
              login: repository.owner.login,
              id: repository.owner.id,
            },
            description: repository.description,
            private: repository.private,
            fork: repository.fork,
            default_branch: repository.default_branch,
            language: repository.language,
            stargazers_count: repository.stargazers_count,
            html_url: repository.html_url,
            clone_url: repository.clone_url,
            size: repository.size,
            updated_at: repository.updated_at,
          },
        });
      } catch (error) {
        console.error('[GitHub API] get-repo-details error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to fetch repository details' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[GitHub API] Unhandled error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal error',
      repositories: [],
    }, { status: 500 });
  }
}
