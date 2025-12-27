import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const { token, owner, repo, branch } = await request.json();

    if (!token || !owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: token, owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    // Get authenticated user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const authenticatedUser = user.login;

    // Check if fork already exists
    let forkedRepo = null;
    try {
      const { data: existingRepo } = await octokit.rest.repos.get({
        owner: authenticatedUser,
        repo,
      });

      forkedRepo = existingRepo;
      console.log(`[GitHub Fork API] Using existing fork at ${existingRepo.html_url}`);

      // If a specific branch is requested and doesn't exist on the fork, create it
      let existingBranchStatus = 'not_requested';
      let existingBranchReady = false;

      if (branch) {
        try {
          // Check if branch exists on fork
          await octokit.rest.git.getRef({
            owner: authenticatedUser,
            repo,
            ref: `heads/${branch}`,
          });
          console.log(`[GitHub Fork API] Branch ${branch} already exists on fork`);
          existingBranchStatus = 'already_exists';
          existingBranchReady = true;
        } catch (branchErr) {
          if (branchErr.status === 404) {
            // Branch doesn't exist on fork, create it from source
            try {
              const { data: sourceBranchRef } = await octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${branch}`,
              });

              await octokit.rest.git.createRef({
                owner: authenticatedUser,
                repo,
                ref: `refs/heads/${branch}`,
                sha: sourceBranchRef.object.sha,
              });

              console.log(`[GitHub Fork API] Created branch ${branch} on existing fork`);
              existingBranchStatus = 'created';
              existingBranchReady = true;
            } catch (createErr) {
              console.warn(`[GitHub Fork API] Failed to create branch on existing fork:`, createErr.message);
              existingBranchStatus = 'failed';
            }
          } else {
            throw branchErr;
          }
        }
      }

      // Fork already exists, return it
      return NextResponse.json({
        success: true,
        fork: {
          id: existingRepo.id,
          name: existingRepo.name,
          owner: existingRepo.owner.login,
          url: existingRepo.html_url,
          cloneUrl: existingRepo.clone_url,
          defaultBranch: existingRepo.default_branch,
          isForked: true,
          source: {
            owner,
            repo,
          },
        },
        branchStatus: existingBranchStatus,
        branchReady: existingBranchReady,
      });
    } catch (err) {
      // Fork doesn't exist, create it
      if (err.status !== 404) {
        throw err;
      }
    }

    // Create fork
    const { data: newForkedRepo } = await octokit.rest.repos.createFork({
      owner,
      repo,
    });

    forkedRepo = newForkedRepo;

    // Wait for fork to be ready (GitHub needs a moment to replicate)
    console.log(`[GitHub Fork API] Waiting for fork ${authenticatedUser}/${newForkedRepo.name} to be ready...`);
    let retries = 0;
    let isReady = false;
    const maxRetries = 20;
    const retryDelay = 1500; // 1.5 second delay between retries

    while (retries < maxRetries && !isReady) {
      try {
        const { data: readyRepo } = await octokit.rest.repos.get({
          owner: authenticatedUser,
          repo: newForkedRepo.name,
        });
        console.log(`[GitHub Fork API] Fork is ready: ${readyRepo.html_url}`);
        isReady = true;
      } catch (err) {
        retries++;
        if (retries < maxRetries) {
          console.log(`[GitHub Fork API] Fork not ready yet (attempt ${retries}/${maxRetries}), retrying...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          console.warn(`[GitHub Fork API] Fork didn't become ready after ${maxRetries} attempts, proceeding anyway`);
          isReady = true; // Force proceed after max retries
        }
      }
    }

    // If a specific branch is requested, create it on the fork and verify it exists
    let branchCreationStatus = 'not_requested';
    let branchReady = false;

    if (branch) {
      try {
        console.log(`[GitHub Fork API] Creating branch ${branch} on new fork...`);

        // Step 1: Get the commit SHA from the source branch
        let sourceSha;
        try {
          const { data: sourceBranchRef } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
          });
          sourceSha = sourceBranchRef.object.sha;
          console.log(`[GitHub Fork API] Source branch ${branch} found with SHA ${sourceSha}`);
        } catch (srcErr) {
          console.error(`[GitHub Fork API] Source branch ${branch} not found:`, srcErr.message);
          branchCreationStatus = 'failed_source_not_found';
          throw srcErr;
        }

        // Step 2: Create the branch on the fork
        try {
          await octokit.rest.git.createRef({
            owner: authenticatedUser,
            repo: newForkedRepo.name,
            ref: `refs/heads/${branch}`,
            sha: sourceSha,
          });
          console.log(`[GitHub Fork API] Created branch ${branch} on fork`);
          branchCreationStatus = 'created';
        } catch (createRefErr) {
          if (createRefErr.status === 422) {
            console.log(`[GitHub Fork API] Branch ${branch} already exists on fork`);
            branchCreationStatus = 'already_exists';
          } else {
            throw createRefErr;
          }
        }

        // Step 3: Verify branch exists and is accessible (with retry)
        let branchVerified = false;
        let verifyAttempts = 0;
        const maxVerifyAttempts = 15;
        const verifyDelay = 1000; // 1 second between retries - GitHub needs time to propagate

        while (verifyAttempts < maxVerifyAttempts && !branchVerified) {
          try {
            const { data: verifyRef } = await octokit.rest.git.getRef({
              owner: authenticatedUser,
              repo: newForkedRepo.name,
              ref: `heads/${branch}`,
            });

            // Double-check the branch is the right one
            if (verifyRef.object.sha === sourceSha) {
              console.log(`[GitHub Fork API] Verified branch ${branch} exists with correct SHA on fork`);
              branchVerified = true;
              branchReady = true;
              branchCreationStatus = branchCreationStatus === 'created' ? 'created_and_verified' : 'verified';
            } else {
              console.warn(`[GitHub Fork API] Branch SHA mismatch - retrying`);
            }
          } catch (verifyErr) {
            verifyAttempts++;
            if (verifyAttempts < maxVerifyAttempts) {
              console.log(`[GitHub Fork API] Verifying branch (attempt ${verifyAttempts}/${maxVerifyAttempts})...`);
              await new Promise((resolve) => setTimeout(resolve, verifyDelay));
            } else {
              console.warn(`[GitHub Fork API] Failed to verify branch ${branch} after ${maxVerifyAttempts} attempts`);
              branchCreationStatus = branchCreationStatus === 'created' ? 'created_but_unverified' : 'unverified';
            }
          }
        }
      } catch (branchErr) {
        console.error(`[GitHub Fork API] Branch operation failed:`, branchErr.message);
        branchCreationStatus = branchCreationStatus || 'failed';
      }
    }

    return NextResponse.json({
      success: true,
      fork: {
        id: newForkedRepo.id,
        name: newForkedRepo.name,
        owner: newForkedRepo.owner.login,
        url: newForkedRepo.html_url,
        cloneUrl: newForkedRepo.clone_url,
        defaultBranch: newForkedRepo.default_branch,
        isForked: true,
        source: {
          owner,
          repo,
        },
      },
      branchStatus: branchCreationStatus,
      branchReady: branchReady,
    });
  } catch (error) {
    console.error('GitHub fork error:', error);

    let status = 500;
    let message = 'Failed to fork repository';

    if (error.status === 401) {
      status = 401;
      message = 'Invalid GitHub token';
    } else if (error.status === 403) {
      status = 403;
      message = 'Permission denied - check your GitHub token permissions';
    } else if (error.status === 404) {
      status = 404;
      message = 'Repository not found';
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
