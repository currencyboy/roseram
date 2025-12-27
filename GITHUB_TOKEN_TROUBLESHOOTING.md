# GitHub Token Troubleshooting

## Problem: Stuck on "Creating Working Branch"

If your editor is stuck on the loading screen showing "Creating Working Branch" → "Setting up your repository for editing..." → "Initializing editor", the most common cause is that **your GitHub token doesn't have the required permissions**.

## Required GitHub Token Scopes

Your personal access token **MUST** have the `repo` scope:

| Scope | What It Allows | Required? |
|-------|---|---|
| `repo` | Full control of private repositories (read, write, delete branches) | ✅ **YES** |
| `public_repo` | Only public repositories | ❌ Not sufficient |
| `workflow` | Actions workflows | ❌ Not needed |

## Solution: Generate a Correct Token

### Step 1: Go to GitHub Token Settings
Visit: https://github.com/settings/tokens/new

### Step 2: Configure Your Token
1. **Token name**: `roseram-ide` (or any descriptive name)
2. **Expiration**: 30 days (or longer if needed)
3. **Scopes**: Select **`repo`** (full control of private repositories)

### Step 3: Copy & Use Token
1. Copy the generated token (starts with `ghp_`)
2. Return to the IDE
3. Click **Connect GitHub**
4. Paste the token
5. Click **Connect Repository**

## Error Messages & Fixes

### Error: "Resource not accessible by personal access token"
**Cause**: Token doesn't have the `repo` scope  
**Fix**: Generate a new token with `repo` scope enabled

```
Old token scopes: public_repo
New token scopes: repo
```

### Error: "Your GitHub token does not have permission to create branches"
**Cause**: Same as above - token missing `repo` scope  
**Fix**: Generate new token with correct scopes

### Error: "Repository not found"
**Cause**: 
- Token doesn't have access to the repository
- Repository name is incorrect
- Repository was deleted

**Fix**:
1. Verify the repository exists at github.com
2. Verify you have access to it
3. Generate a new token with `repo` scope

### Error: "Token is invalid or expired"
**Cause**: 
- Token was revoked
- Token expired
- Typo when copying token

**Fix**: Generate a new token and try again

## Checking Your Token's Scopes

Once you've connected your token, the IDE will automatically validate its scopes. If validation fails, you'll see an error message explaining what's missing.

To manually check token scopes:

1. Go to https://github.com/settings/tokens
2. Find your token
3. Look at the "Scopes" section - must show `repo` (or a superset)

### Example Token with Correct Scopes
```
✓ repo
  ├─ Full control of private repositories
  ├─ Read repositories
  ├─ Write repositories
  └─ Delete repositories
```

## Supported Token Types

| Type | Works? | Notes |
|------|--------|-------|
| Personal Access Token (Classic) | ✅ YES | Use this - easy to manage |
| Fine-grained PAT | ❌ NO | Not yet supported by this IDE |
| OAuth App Token | ❌ NO | Requires different setup |

## Step-by-Step: Create New Token

```
1. Go to https://github.com/settings/tokens/new
2. Name: "roseram-ide"
3. Expiration: "30 days"
4. ☑ repo (click to expand and select)
   ☑ Full control of private repositories
5. Generate token
6. Copy the token (ghp_xxxxx)
7. Return to IDE
8. Click "Connect GitHub"
9. Paste token
10. Click "Connect Repository"
11. Select your repository
12. Wait for "Creating Working Branch" to complete
```

## Firewall/Network Issues

If you have a corporate firewall, make sure it allows:
- `api.github.com` (GitHub API)
- `github.com` (GitHub web)

## Still Stuck?

If you've tried all the above and still see the loading screen:

1. **Check browser console** (F12 → Console tab)
   - Look for red error messages
   - Take a screenshot of any errors

2. **Try a different repository**
   - Sometimes one repo has permission issues
   - Try creating a test repo and connecting to that

3. **Disconnect & reconnect**
   - Click "Disconnect All" in the integration modal
   - Click "Load All"
   - Re-enter your token
   - Try again

4. **Generate a completely new token**
   - Old token might have been corrupted
   - Delete the old one
   - Generate a fresh one at https://github.com/settings/tokens/new
   - Use correct scopes: `repo`

## What Happens Behind the Scenes

When you select a repository:

```
1. Token validation
   └─ Checks that token has "repo" scope ✓

2. Branch detection
   └─ Looks for existing roseram-* branches

3. Branch creation (if needed)
   └─ Creates new branch on GitHub
   └─ Requires "repo" scope (write permission)

4. File loading
   └─ Fetches file tree from the branch

5. Editor initialization
   └─ Loads critical files into memory
```

If any step fails, you'll see an error message explaining what went wrong.

## Revoking Tokens

If you accidentally exposed a token:

1. Go to https://github.com/settings/tokens
2. Find the token
3. Click "Delete"
4. Generate a new one

## Security Best Practices

✅ **DO:**
- Use tokens with minimal required scopes (`repo` only, not more)
- Set tokens to expire (30 days recommended)
- Delete tokens you're not using
- Use different tokens for different applications

❌ **DON'T:**
- Share tokens with others
- Commit tokens to git repositories
- Use tokens that never expire
- Use tokens with more scopes than needed

## See Also
- [GitHub Token Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [BRANCH_RESUMPTION_GUIDE.md](./BRANCH_RESUMPTION_GUIDE.md) - How branch resumption works
- [ARCHITECTURE_REFACTOR_SUMMARY.md](./ARCHITECTURE_REFACTOR_SUMMARY.md) - Overall IDE architecture
