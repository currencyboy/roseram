import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

export async function POST(request) {
  try {
    const body= await request.json();
    const {
      repoUrl,
      token,
      fileName,
      fileContent,
      message,
      branch = "main",
    } = body;

    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL" },
        { status: 400 }
      );
    }

    const [, owner, repo] = match;

    const octokit = new Octokit({ auth: token });

    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: refData.object.sha,
      recursive: "true",
    });

    const existingFile = treeData.tree.find((f) => f.path === fileName);

    let fileSha = existingFile?.sha;

    if (existingFile) {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ("sha" in fileData) {
        fileSha = fileData.sha;
      }
    }

    const { data: createResponse } =
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(fileContent).toString("base64"),
        branch,
        sha,
      });

    return NextResponse.json({
      success,
      commit: createResponse.commit.sha,
      htmlUrl: createResponse.commit.html_url,
    });
  } catch (error) {
    console.error("GitHub push error:", error);
    return NextResponse.json(
      { error: "Failed to push to GitHub" },
      { status: 500 }
    );
  }
}
