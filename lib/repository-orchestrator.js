import { Octokit } from 'octokit';
import { deployToFlyIO, pollDeploymentStatus, isFlyIOConfigured } from '@/lib/flyio-deployment';
import { logger } from '@/lib/errors';
import { supabaseServer } from '@/lib/supabase';
import crypto from 'crypto';

/**
 * Repository Orchestrator
 * Handles complete workflow: fork repo -> deploy to Fly.io -> poll status
 */
class RepositoryOrchestrator {
  constructor() {
    this.activeWorkflows = new Map(); // Track in-progress workflows
  }

  /**
   * Generate a unique Fly.io app name from user ID and project name
   */
  generateAppName(userId, projectName) {
    const hash = crypto
      .createHash('md5')
      .update(`${userId}-${projectName}-${Date.now()}`)
      .digest('hex')
      .slice(0, 8);
    return `roseram-${hash}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Orchestrate complete fork + deploy workflow
   * Steps:
   * 1. Fork repository
   * 2. Create Fly.io app
   * 3. Deploy to Fly.io
   * 4. Poll deployment status
   */
  async orchestrateForkAndDeploy(userId, githubToken, sourceOwner, sourceRepo, options = {}) {
    const workflowId = `${userId}-${sourceRepo}-${Date.now()}`;
    const progressCallback = options.progressCallback || (() => {});
    const region = options.region || 'cdg';
    const branch = options.branch || 'main';

    try {
      // Initialize workflow tracking
      this.activeWorkflows.set(workflowId, { status: 'starting', step: 'initialize' });

      progressCallback({
        step: 'initialize',
        status: 'in_progress',
        message: 'Initializing fork and deploy process...',
        progress: 5,
      });

      // Validate Fly.io configuration
      if (!isFlyIOConfigured()) {
        throw new Error('Fly.io is not configured. Please set FLY_IO_TOKEN environment variable.');
      }

      // Initialize GitHub API
      const octokit = new Octokit({ auth: githubToken });
      const { data: user } = await octokit.rest.users.getAuthenticated();
      const authenticatedUser = user.login;

      progressCallback({
        step: 'fork_start',
        status: 'in_progress',
        message: `Forking repository ${sourceOwner}/${sourceRepo}...`,
        progress: 10,
      });

      // Step 1: Fork repository
      let forkedRepo = null;
      let isNewFork = false;

      try {
        // Check if fork already exists
        const { data: existingRepo } = await octokit.rest.repos.get({
          owner: authenticatedUser,
          repo: sourceRepo,
        });
        forkedRepo = existingRepo;
        logger.info('[Orchestrator] Using existing fork', { url: existingRepo.html_url });
      } catch (err) {
        if (err.status === 404) {
          // Fork doesn't exist, create it
          try {
            const { data: newForkedRepo } = await octokit.rest.repos.createFork({
              owner: sourceOwner,
              repo: sourceRepo,
            });
            forkedRepo = newForkedRepo;
            isNewFork = true;

            // Wait for fork to be ready
            let forkReady = false;
            let retries = 0;
            const maxRetries = 20;
            const retryDelay = 1500;

            while (retries < maxRetries && !forkReady) {
              try {
                await octokit.rest.repos.get({
                  owner: authenticatedUser,
                  repo: sourceRepo,
                });
                forkReady = true;
                logger.info('[Orchestrator] Fork is ready', { url: forkedRepo.html_url });
              } catch (e) {
                retries++;
                if (retries < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                  logger.warn('[Orchestrator] Fork not ready after retries, proceeding anyway');
                  forkReady = true;
                }
              }
            }
          } catch (forkErr) {
            throw new Error(`Failed to fork repository: ${forkErr.message}`);
          }
        } else {
          throw err;
        }
      }

      progressCallback({
        step: 'fork_complete',
        status: 'complete',
        message: `Repository ${isNewFork ? 'forked' : 'already exists'} at ${forkedRepo.html_url}`,
        progress: 25,
        forkUrl: forkedRepo.html_url,
        forkCloneUrl: forkedRepo.clone_url,
      });

      // Create or ensure branch exists
      if (branch !== forkedRepo.default_branch) {
        progressCallback({
          step: 'branch_create',
          status: 'in_progress',
          message: `Creating branch ${branch}...`,
          progress: 35,
        });

        try {
          // Check if branch exists
          try {
            await octokit.rest.git.getRef({
              owner: authenticatedUser,
              repo: sourceRepo,
              ref: `heads/${branch}`,
            });
            logger.info('[Orchestrator] Branch already exists');
          } catch (branchErr) {
            if (branchErr.status === 404) {
              // Get source branch commit SHA
              const { data: sourceBranchRef } = await octokit.rest.git.getRef({
                owner: sourceOwner,
                repo: sourceRepo,
                ref: `heads/${branch}`,
              });

              // Create branch on fork
              await octokit.rest.git.createRef({
                owner: authenticatedUser,
                repo: sourceRepo,
                ref: `refs/heads/${branch}`,
                sha: sourceBranchRef.object.sha,
              });
              logger.info('[Orchestrator] Branch created', { branch });
            } else {
              throw branchErr;
            }
          }

          progressCallback({
            step: 'branch_ready',
            status: 'complete',
            message: `Branch ${branch} is ready`,
            progress: 45,
          });
        } catch (branchErr) {
          logger.warn('[Orchestrator] Failed to create branch, proceeding with default', { error: branchErr.message });
        }
      }

      // Generate app name
      const appName = this.generateAppName(userId, sourceRepo);

      progressCallback({
        step: 'deploy_start',
        status: 'in_progress',
        message: `Deploying to Fly.io as "${appName}"...`,
        progress: 50,
        appName,
      });

      // Step 2: Deploy to Fly.io
      const deploymentResult = await deployToFlyIO(
        appName,
        forkedRepo.clone_url,
        branch,
        {
          GITHUB_REPO: forkedRepo.clone_url,
          BRANCH: branch,
          FORK_OWNER: authenticatedUser,
          SOURCE_OWNER: sourceOwner,
          SOURCE_REPO: sourceRepo,
        }
      );

      progressCallback({
        step: 'deploy_submitted',
        status: 'in_progress',
        message: 'Deployment submitted to Fly.io, waiting for machine to start...',
        progress: 60,
        previewUrl: deploymentResult.previewUrl,
        deploymentId: deploymentResult.releaseId,
      });

      // Step 3: Poll deployment status
      let pollAttempts = 0;
      const maxPollAttempts = 120; // 10 minutes with 5 second intervals
      const pollInterval = 5000; // 5 seconds
      let deploymentReady = false;
      let finalStatus = null;

      while (pollAttempts < maxPollAttempts && !deploymentReady) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        pollAttempts++;

        try {
          const statusResult = await pollDeploymentStatus(appName, 1, pollInterval);

          if (statusResult.status === 'running') {
            deploymentReady = true;
            finalStatus = statusResult;
            progressCallback({
              step: 'deployed',
              status: 'complete',
              message: `Preview is live at ${statusResult.previewUrl}`,
              progress: 100,
              previewUrl: statusResult.previewUrl,
              deploymentId: deploymentResult.releaseId,
            });
          } else if (statusResult.status === 'error') {
            throw new Error(statusResult.errorMessage || 'Deployment failed');
          }

          // Progress indicator while polling
          if (pollAttempts % 6 === 0) {
            const progressPercent = 60 + Math.min((pollAttempts / maxPollAttempts) * 35, 35);
            progressCallback({
              step: 'polling',
              status: 'in_progress',
              message: `Waiting for preview to be ready... (${pollAttempts * 5}s)`,
              progress: Math.floor(progressPercent),
            });
          }
        } catch (pollErr) {
          logger.warn('[Orchestrator] Poll error (will retry)', { error: pollErr.message, attempt: pollAttempts });
        }
      }

      if (!deploymentReady) {
        logger.warn('[Orchestrator] Timeout polling deployment, but proceeding anyway');
        finalStatus = {
          status: 'timeout',
          previewUrl: deploymentResult.previewUrl,
        };
        progressCallback({
          step: 'deployed',
          status: 'complete',
          message: `Preview should be available at ${deploymentResult.previewUrl}`,
          progress: 100,
          previewUrl: deploymentResult.previewUrl,
          deploymentId: deploymentResult.releaseId,
        });
      }

      // Clean up workflow tracking
      this.activeWorkflows.delete(workflowId);

      return {
        success: true,
        workflowId,
        fork: {
          url: forkedRepo.html_url,
          cloneUrl: forkedRepo.clone_url,
          owner: authenticatedUser,
          repo: sourceRepo,
          branch,
          isNewFork,
        },
        deployment: {
          appName,
          previewUrl: finalStatus.previewUrl || deploymentResult.previewUrl,
          region,
          status: finalStatus.status || 'running',
          deploymentId: deploymentResult.releaseId,
        },
      };
    } catch (error) {
      logger.error('[Orchestrator] Workflow failed', { workflowId, error: error.message });
      this.activeWorkflows.delete(workflowId);

      progressCallback({
        step: 'error',
        status: 'error',
        message: error.message,
        progress: 0,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId) {
    return this.activeWorkflows.get(workflowId);
  }
}

export default new RepositoryOrchestrator();
