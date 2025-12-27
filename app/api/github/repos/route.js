import { NextRequest, NextResponse } from "next/server";

export async function GET(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const envToken = process.env.GITHUB_ACCESS_TOKEN;
  
  const finalToken = token || envToken;
  
  if (!finalToken) {
    return NextResponse.json(
      { error: "No GitHub token provided. Set GITHUB_ACCESS_TOKEN environment variable or pass token in Authorization header." },
      { status: 401 }
    );
  }

  try {
    const allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member&sort=updated`,
        {
          headers: {
            Authorization: `token ${finalToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "RoseramBuilder",
          },
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        console.error("GitHub API error:", response.status, responseText);
        return NextResponse.json(
          {
            error: `GitHub API error: ${response.status}. Token may be invalid, expired, or lack 'repo' scope.`,
            details:
              response.status === 401
                ? "Unauthorized - check token validity"
                : response.status === 403
                  ? "Forbidden - check token scopes"
                  : "Unknown error",
          },
          { status: response.status }
        );
      }

      const repos = JSON.parse(responseText);

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

    return NextResponse.json({
      repositories: allRepos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        description: repo.description,
        defaultBranch: repo.default_branch,
        owner: repo.owner?.login || repo.owner?.name || "unknown",
        isPrivate: repo.private,
        isFork: repo.fork,
      })),
    });
  } catch (error) {
    console.error("GitHub fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch repositories",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
