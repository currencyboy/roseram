import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

async function fetchRepositoryStructureViaContents(octokit, owner, repo, branch) {
  const filesList = [];
  const visited = new Set();
  const maxDepth = 50; // Allow up to 50 levels of directory nesting (very generous limit)
  let totalItemsProcessed = 0;
  let directoriesSkipped = 0;

  async function walkDirectory(path = "", currentDepth = 0) {
    if (visited.has(path)) return;
    visited.add(path);

    try {
      const { data: contents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: path || "/",
        ref: branch,
      });

      const items = Array.isArray(contents) ? contents : [contents];

      for (const item of items) {
        totalItemsProcessed++;

        if (item.type === "file") {
          filesList.push({
            path: item.path,
            name: item.name,
            type: "file",
            sha: item.sha,
          });
        } else if (item.type === "dir") {
          // Recursively walk subdirectories with generous depth limit
          if (currentDepth < maxDepth) {
            await walkDirectory(item.path, currentDepth + 1);
          } else {
            directoriesSkipped++;
            console.warn(`Reached max depth (${maxDepth}) for directory: ${item.path}`);
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const displayPath = path || "root";
      if (displayPath === "root") {
        console.error(`Failed to fetch repository root for ${owner}/${repo} on branch ${branch}: ${errorMsg}`);
        throw new Error(`Repository root fetch failed: ${errorMsg}`);
      } else {
        console.warn(`Could not fetch contents for ${displayPath}: ${errorMsg}`);
      }
    }
  }

  await walkDirectory("", 0);

  if (directoriesSkipped > 0) {
    console.warn(`[Repository] Skipped ${directoriesSkipped} directories due to max depth limit`);
  }

  console.log(`[Repository] Contents API walkthrough: processed ${totalItemsProcessed} items, found ${filesList.length} files`);

  return filesList.sort((a, b) => a.path.localeCompare(b.path));
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const headerToken = authHeader?.replace("Bearer ", "").replace("token ", "");
    const token = headerToken || process.env.GITHUB_ACCESS_TOKEN;

    if (!token) {
      console.error("GitHub token not provided - no Authorization header or GITHUB_ACCESS_TOKEN env var");
      return NextResponse.json(
        { error: "GitHub token not configured", details: "Please provide token via Authorization header or set GITHUB_ACCESS_TOKEN" },
        { status: 401 }
      );
    }

    const tokenSource = headerToken ? "Authorization header" : "environment variable";
    const tokenPreview = token ? `${token.substring(0, 10)}...` : "EMPTY";
    console.log("Using GitHub token from:", tokenSource, `(${tokenPreview})`);

    const octokit = new Octokit({
      auth: token,
    });

    const body = await request.json();
    const { action, owner, repo, repository, branch = "main", path, content, message, commitMessage, files, ref: refParam } = body;

    switch (action) {
      case "getDefaultBranch": {
        if (!repo) {
          return NextResponse.json(
            { error: "Repository name required" },
            { status: 400 }
          );
        }

        try {
          let ownerName = owner;

          if (!ownerName) {
            try {
              const { data: user } = await octokit.rest.users.getAuthenticated();
              ownerName = user.login;
            } catch (authError) {
              return NextResponse.json(
                {
                  error: "GitHub authentication failed",
                  details: "Your GitHub token is invalid, expired, or doesn't have the required permissions.",
                },
                { status: 401 }
              );
            }
          }

          console.log(`[Repository] Fetching default branch for ${ownerName}/${repo}`);

          const { data: repoData } = await octokit.rest.repos.get({
            owner: ownerName,
            repo,
          });

          const defaultBranch = repoData.default_branch || 'main';
          console.log(`[Repository] Default branch for ${ownerName}/${repo}: ${defaultBranch}`);

          return NextResponse.json({
            success: true,
            defaultBranch,
            owner: ownerName,
            repo,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.error(`[Repository] Failed to fetch default branch for ${owner}/${repo}:`, errorMsg);

          if (errorMsg.includes("Not Found") || errorMsg.includes("404")) {
            return NextResponse.json(
              {
                error: "Repository not found",
                details: `Could not find repository ${owner}/${repo}. Verify the repository exists and is accessible with your GitHub token.`,
              },
              { status: 404 }
            );
          }

          if (errorMsg.includes("Bad credentials") || errorMsg.includes("401")) {
            return NextResponse.json(
              {
                error: "GitHub authentication failed",
                details: "Your GitHub token is invalid, expired, or doesn't have access to this repository.",
              },
              { status: 401 }
            );
          }

          return NextResponse.json(
            {
              error: "Failed to fetch repository info",
              details: errorMsg,
            },
            { status: 500 }
          );
        }
      }

      case "list": {
        const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser();
        return NextResponse.json({
          success: true,
          repositories: repos.map((r) => ({
            id: r.id,
            name: r.name,
            url: r.html_url,
            description: r.description,
            owner: r.owner?.login,
          })),
        });
      }

      case "create": {
        if (!repo) {
          return NextResponse.json(
            { error: "Repository name required" },
            { status: 400 }
          );
        }

        const { data: newRepo } = await octokit.rest.repos.createForAuthenticatedUser({
          name: repo,
          description: `Generated with Roseram Builder`,
          private: false,
        });

        return NextResponse.json({
          success: true,
          repository: {
            id: newRepo.id,
            name: newRepo.name,
            url: newRepo.html_url,
          },
        });
      }

      case "push": {
        if (!owner || !repo || !path || !content) {
          return NextResponse.json(
            { error: "Missing required parameters: owner, repo, path, content" },
            { status: 400 }
          );
        }

        const { data: currentFile } = await octokit.rest.repos
          .getContent({
            owner,
            repo,
            path,
            ref: refParam,
          })
          .catch(() => ({ data: null }));

        const { data: response } = await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: message || `Update ${path} with Roseram Builder`,
          content: Buffer.from(content).toString("base64"),
          branch,
          sha: typeof currentFile === "object" && currentFile !== null && "sha" in currentFile ? currentFile.sha : undefined,
        });

        return NextResponse.json({
          success: true,
          commit: {
            sha: response.commit.sha,
            url: response.commit.html_url,
          },
        });
      }

      case "getStructure": {
        if (!repo) {
          return NextResponse.json(
            { error: "Repository name required" },
            { status: 400 }
          );
        }

        let ownerName = owner;

        try {
          if (!ownerName) {
            try {
              const { data: user } = await octokit.rest.users.getAuthenticated();
              ownerName = user.login;
            } catch (authError) {
              const errorMsg = authError instanceof Error ? authError.message : "Unknown error";
              console.error("Failed to authenticate with GitHub API. Token may be invalid or expired:", errorMsg);
              return NextResponse.json(
                {
                  error: "GitHub authentication failed",
                  details: "Your GitHub token is invalid, expired, or doesn't have the required permissions. Please generate a new personal access token at https://github.com/settings/tokens with 'repo' scope.",
                  debug: errorMsg
                },
                { status: 401 }
              );
            }
          }

          console.log(`Fetching repository structure for ${ownerName}/${repo} (branch: ${branch})`);

          // Set a server-side timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Server-side timeout: Repository structure request took too long')), 15000)
          );

          const getStructurePromise = (async () => {
            let treeSha = branch;
            try {
              const { data: refData } = await octokit.rest.git.getRef({
                owner: ownerName,
                repo,
                ref: `heads/${branch}`,
              });
              treeSha = refData.object.sha;
              console.log(`Resolved branch ${branch} to SHA: ${treeSha}`);
            } catch (refError) {
              const errorMsg = refError instanceof Error ? refError.message : "Unknown error";
              console.warn(`Could not resolve branch ${branch}, attempting direct use. Error: ${errorMsg}`);
            }

            console.log(`Fetching tree with SHA: ${treeSha}`);

            let filesList = [];
            let usedFallback = false;

            try {
              const { data: tree } = await octokit.rest.git.getTree({
                owner: ownerName,
                repo,
                tree_sha: treeSha,
                recursive: "1",
              });

              // Check if response was truncated
              if (tree.truncated) {
                console.warn(`Tree response was truncated for ${ownerName}/${repo}. Using limited contents API.`);
                usedFallback = true;
              } else {
                filesList = tree.tree
                  .filter((item) => item.type === "blob" && typeof item.path === "string")
                  .map((item) => ({
                    path: item.path,
                    name: item.path.split("/").pop(),
                    type: "file",
                    sha: item.sha,
                  }))
                  .sort((a, b) => a.path.localeCompare(b.path));
              }
            } catch (treeError) {
              const errorMsg = treeError instanceof Error ? treeError.message : "Unknown error";
              console.warn(`Failed to fetch with git.getTree: ${errorMsg}. Attempting limited contents API.`);
              usedFallback = true;
            }

            // Fallback: use contents API with LIMITED depth (only 3 levels max, not 50)
            if (usedFallback) {
              console.log(`Using limited contents API fallback for ${ownerName}/${repo} (max depth: 3)`);
              try {
                const filesList_fallback = [];
                const visited = new Set();
                const maxDepth = 3; // REDUCED from 50 to 3 for performance

                async function walkDirectory(path = "", currentDepth = 0) {
                  if (visited.has(path) || currentDepth > maxDepth) return;
                  visited.add(path);

                  try {
                    const { data: contents } = await octokit.rest.repos.getContent({
                      owner: ownerName,
                      repo,
                      path: path || "/",
                      ref: branch,
                    });

                    const items = Array.isArray(contents) ? contents : [contents];

                    for (const item of items) {
                      if (item.type === "file") {
                        filesList_fallback.push({
                          path: item.path,
                          name: item.name,
                          type: "file",
                          sha: item.sha,
                        });
                      } else if (item.type === "dir" && currentDepth < maxDepth) {
                        await walkDirectory(item.path, currentDepth + 1);
                      }
                    }
                  } catch (err) {
                    console.warn(`Could not fetch directory ${path || "root"}: ${err instanceof Error ? err.message : "Unknown error"}`);
                  }
                }

                await walkDirectory("", 0);
                filesList = filesList_fallback.sort((a, b) => a.path.localeCompare(b.path));
              } catch (fallbackError) {
                const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : "Unknown error";
                console.error(`Limited contents API fallback failed for ${ownerName}/${repo}: ${fallbackMsg}`);
                // Return empty files list instead of throwing
                filesList = [];
              }
            }

            // Check if we got any files
            if (filesList.length === 0) {
              console.warn(`No files found for ${ownerName}/${repo} on branch ${branch}. Repository may be empty, private, or inaccessible.`);
            }

            console.log(`Successfully fetched ${filesList.length} files from ${ownerName}/${repo}`);
            return {
              success: true,
              files: filesList,
            };
          })();

          // Race between timeout and actual request
          const result = await Promise.race([getStructurePromise, timeoutPromise]);
          return NextResponse.json(result);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.error("Get structure error:", error);

          if (errorMsg.includes("Bad credentials") || errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
            return NextResponse.json(
              {
                error: "GitHub authentication failed",
                details: "Your GitHub token is invalid, expired, or doesn't have the required permissions. Please generate a new personal access token at https://github.com/settings/tokens with 'repo' scope.",
                debug: errorMsg
              },
              { status: 401 }
            );
          }

          if (errorMsg.includes("Not Found") || errorMsg.includes("404")) {
            return NextResponse.json(
              {
                error: "Repository not found",
                details: `The repository ${ownerName}/${repo} could not be found. Please verify the owner and repository name are correct.`,
                debug: errorMsg
              },
              { status: 404 }
            );
          }

          return NextResponse.json(
            {
              error: "Failed to get repository structure",
              details: errorMsg,
              owner: ownerName,
              repo: repo
            },
            { status: 500 }
          );
        }
        break;
      }

      case "getFile": {
        if (!repo || !path) {
          return NextResponse.json(
            { error: "Repository name and file path required" },
            { status: 400 }
          );
        }

        try {
          let ownerName = owner;

          if (!ownerName) {
            const { data: user } = await octokit.rest.users.getAuthenticated();
            ownerName = user.login;
          }

          const { data } = await octokit.rest.repos.getContent({
            owner: ownerName,
            repo,
            path,
            ref: refParam,
          });

          if (!("content" in data) || data.type !== "file" || data.encoding !== "base64") {
            return NextResponse.json(
              { success: false, message: "Not a readable file or too large (>1MB)." },
              { status: 400 }
            );
          }

          const fileContent = Buffer.from(data.content, "base64").toString("utf-8");

          return NextResponse.json({
            success: true,
            file: {
              path: data.path,
              name: data.name,
              content: fileContent,
              type: data.type,
            },
          });
        } catch (error) {
          console.error("Get file error:", error);
          return NextResponse.json(
            { success: false, error: "Failed to get file content", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
          );
        }
      }

      case "commitCode": {
        if (!files || !commitMessage) {
          return NextResponse.json(
            { error: "Missing required parameters: files, commitMessage" },
            { status: 400 }
          );
        }

        try {
          const repoName = repository || repo;
          if (!repoName) {
            return NextResponse.json(
              { error: "Missing required parameter: repository or repo name" },
              { status: 400 }
            );
          }

          const { data: user } = await octokit.rest.users.getAuthenticated();
          const ownerName = user.login;

          const commitResults = [];

          for (const [filePath, fileContent] of Object.entries(files)) {
            const { data: currentFile } = await octokit.rest.repos
              .getContent({
                owner: ownerName,
                repo: repoName,
                path: filePath,
                ref: refParam,
              })
              .catch(() => ({ data: null }));

            const { data: response } = await octokit.rest.repos.createOrUpdateFileContents({
              owner: ownerName,
              repo: repoName,
              path: filePath,
              message: commitMessage,
              content: Buffer.from(fileContent).toString("base64"),
              branch,
              sha: typeof currentFile === "object" && currentFile !== null && "sha" in currentFile ? currentFile.sha : undefined,
            });

            commitResults.push({
              path: filePath,
              sha: response.commit.sha,
              url: response.commit.html_url,
            });
          }

          return NextResponse.json({
            success: true,
            commits: commitResults,
          });
        } catch (error) {
          console.error("Commit error:", error);
          return NextResponse.json(
            { success: false, error: "Failed to commit code", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Repository API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Repository operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
