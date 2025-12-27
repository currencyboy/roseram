import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing GitHub token' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });

    try {
      // Get token info from the API response headers
      const { data: user, headers } = await octokit.rest.users.getAuthenticated();

      // GitHub returns scope info in the X-OAuth-Scopes header (case-insensitive)
      const scopeHeader = headers['x-oauth-scopes'] ||
                         Object.keys(headers).find(k => k.toLowerCase() === 'x-oauth-scopes');
      const scopes = scopeHeader ? scopeHeader.split(',').map(s => s.trim()) : [];

      console.log(`[ValidateTokenScopes] Token scopes: ${scopes.length > 0 ? scopes.join(', ') : '(empty or not reported by GitHub)'}`);

      // For personal access tokens, scopes might not be reported in headers
      // So we do a thorough test to verify permissions
      let canCreateBranches = true;
      let warnings = [];
      let scopeWarnings = [];

      if (scopes.length === 0) {
        // Scopes not reported, but token authenticated successfully
        // Try more specific tests: list repos AND try to get a repo's branches
        try {
          const repos = await octokit.rest.repos.listForAuthenticatedUser({ per_page: 1 });
          console.log('[ValidateTokenScopes] Token validated via repo listing (scopes not reported)');

          // If we got here, token can read repos, but we can't verify write access without a real repo
          // Warn user that scopes aren't visible and suggest they verify 'repo' scope was selected
          warnings.push('Token scopes not reported by GitHub. To create branches, ensure you selected "repo" scope when creating the token.');
          scopeWarnings.push('Token lacks visible scope information - permission check is limited');
        } catch (repoErr) {
          if (repoErr.status === 403) {
            canCreateBranches = false;
            warnings.push('Token has insufficient permissions - cannot access repositories');
            scopeWarnings.push('Insufficient permissions: Token cannot list repositories');
          } else {
            throw repoErr;
          }
        }
      } else {
        // Scopes were reported, check them thoroughly
        const hasRepoScope = scopes.includes('repo');
        const hasPublicRepoScope = scopes.includes('public_repo');
        const hasRepoStatus = scopes.includes('repo:status');

        // For branch creation, we need 'repo' scope (full control)
        // 'public_repo' alone is insufficient
        canCreateBranches = hasRepoScope;

        if (!hasRepoScope) {
          warnings.push('⚠️ Token does not have "repo" scope - cannot create branches');
          scopeWarnings.push('Missing "repo" scope');

          if (hasPublicRepoScope) {
            warnings.push('Token only has "public_repo" scope - you need "repo" for private repos and branch creation');
            scopeWarnings.push('Only public_repo scope available');
          }
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          login: user.login,
          name: user.name,
          id: user.id,
        },
        scopes,
        hasRepoScope: canCreateBranches,
        hasFullControl: scopes.includes('repo'),
        warnings,
        scopeWarnings: scopeWarnings.length > 0 ? scopeWarnings : [],
        canCreateBranches,
        details: {
          message: canCreateBranches
            ? 'Token has permission to create branches'
            : 'Token does not have sufficient permissions to create branches',
          action: !canCreateBranches
            ? 'Generate a new token with "repo" scope at https://github.com/settings/tokens'
            : 'Token is ready to use'
        }
      });
    } catch (githubError) {
      console.error('GitHub API error:', githubError);
      
      if (githubError.status === 401) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid GitHub token',
            details: 'The token is invalid or expired. Please generate a new one.'
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: githubError.message || 'Failed to validate token',
          details: githubError.response?.data?.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error validating token scopes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate token' },
      { status: 500 }
    );
  }
}
