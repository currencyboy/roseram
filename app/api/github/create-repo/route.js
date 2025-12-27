import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { generateProjectFiles } from '@/lib/project-scaffolder';

export async function POST(request) {
  try {
    const { action, token, repoName, description, isPrivate, files, branch = 'main', projectConfig } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'GitHub token is required' },
        { status: 401 }
      );
    }

    const octokit = new Octokit({ auth: token });

    if (action === 'create') {
      if (!repoName) {
        return NextResponse.json(
          { error: 'Repository name is required' },
          { status: 400 }
        );
      }

      try {
        const { data: user } = await octokit.rest.users.getAuthenticated();
        const owner = user.login;

        // Create repository
        const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          description: description || `Created with RoseRam Builder`,
          private: isPrivate || false,
          auto_init: true,
        });

        // If projectConfig provided, scaffold the project and push files
        if (projectConfig && projectConfig.framework) {
          try {
            console.log('[Create-Repo] Scaffolding project:', projectConfig);

            const scaffoldedFiles = generateProjectFiles(
              projectConfig.framework,
              repoName,
              projectConfig.database !== 'none' ? projectConfig.database : null,
              projectConfig.emailService !== 'none' ? projectConfig.emailService : null
            );

            // Convert to array format for pushing
            const filesToPush = Object.values(scaffoldedFiles).map(file => ({
              path: file.path,
              content: file.content,
            }));

            if (filesToPush.length > 0) {
              console.log('[Create-Repo] Pushing', filesToPush.length, 'scaffolded files');

              // Get the repo reference to push to
              const targetBranch = 'main';
              let headSha;
              try {
                const { data: ref } = await octokit.rest.git.getRef({
                  owner,
                  repo: repoName,
                  ref: `heads/${targetBranch}`,
                });
                headSha = ref.object.sha;
              } catch (error) {
                // If main doesn't exist, try master
                const { data: masterRef } = await octokit.rest.git.getRef({
                  owner,
                  repo: repoName,
                  ref: 'heads/master',
                }).catch(() => {
                  throw new Error('Could not find main or master branch');
                });
                headSha = masterRef.object.sha;
              }

              // Get current commit tree
              const { data: commit } = await octokit.rest.git.getCommit({
                owner,
                repo: repoName,
                commit_sha: headSha,
              });
              const currentTreeSha = commit.tree.sha;

              // Create new tree with file changes
              const tree = filesToPush.map(file => ({
                path: file.path,
                mode: '100644',
                type: 'blob',
                content: file.content,
              }));

              const { data: newTree } = await octokit.rest.git.createTree({
                owner,
                repo: repoName,
                tree: tree,
                base_tree: currentTreeSha,
              });

              // Create commit
              const { data: newCommit } = await octokit.rest.git.createCommit({
                owner,
                repo: repoName,
                message: `Initial commit: ${projectConfig.framework} project scaffolded with RoseRam Builder`,
                tree: newTree.sha,
                parents: [headSha],
              });

              // Update reference
              await octokit.rest.git.updateRef({
                owner,
                repo: repoName,
                ref: `heads/${targetBranch}`,
                sha: newCommit.sha,
              });

              console.log('[Create-Repo] Successfully pushed scaffolded files');
            }
          } catch (scaffoldError) {
            console.error('[Create-Repo] Error scaffolding project:', scaffoldError);
            // Don't fail the repo creation, just warn
            console.warn('[Create-Repo] Project scaffolding failed, but repository was created');
          }
        }

        return NextResponse.json({
          success: true,
          repository: {
            id: repo.id,
            name: repo.name,
            owner: owner,
            url: repo.html_url,
            cloneUrl: repo.clone_url,
            defaultBranch: repo.default_branch,
          },
        });
      } catch (error) {
        console.error('GitHub repo creation error:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to create repository' },
          { status: 500 }
        );
      }
    }

    if (action === 'push') {
      if (!repoName || !files || !Array.isArray(files)) {
        return NextResponse.json(
          { error: 'Repository name and files array are required' },
          { status: 400 }
        );
      }

      try {
        const { data: user } = await octokit.rest.users.getAuthenticated();
        const owner = user.login;

        // Get current branch to push to
        const targetBranch = branch || 'main';

        // Get repository reference (SHA of latest commit on target branch)
        let headSha;
        try {
          const { data: ref } = await octokit.rest.git.getRef({
            owner,
            repo: repoName,
            ref: `heads/${targetBranch}`,
          });
          headSha = ref.object.sha;
        } catch (error) {
          // Branch might not exist, get master/main commit
          const { data: mainRef } = await octokit.rest.git.getRef({
            owner,
            repo: repoName,
            ref: 'heads/main',
          });
          headSha = mainRef.object.sha;
        }

        // Get current commit tree
        const { data: commit } = await octokit.rest.git.getCommit({
          owner,
          repo: repoName,
          commit_sha: headSha,
        });
        const currentTreeSha = commit.tree.sha;

        // Create new tree with file changes
        const tree = files.map(file => ({
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: file.content,
        }));

        const { data: newTree } = await octokit.rest.git.createTree({
          owner,
          repo: repoName,
          tree: tree,
          base_tree: currentTreeSha,
        });

        // Create commit
        const { data: newCommit } = await octokit.rest.git.createCommit({
          owner,
          repo: repoName,
          message: `Initial commit from RoseRam Builder at ${new Date().toISOString()}`,
          tree: newTree.sha,
          parents: [headSha],
        });

        // Update reference
        await octokit.rest.git.updateRef({
          owner,
          repo: repoName,
          ref: `heads/${targetBranch}`,
          sha: newCommit.sha,
        });

        return NextResponse.json({
          success: true,
          message: `Pushed ${files.length} files to ${owner}/${repoName}`,
          commitSha: newCommit.sha,
          files: files.map(f => f.path),
        });
      } catch (error) {
        console.error('GitHub push error:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to push to repository' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('GitHub create-repo route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
