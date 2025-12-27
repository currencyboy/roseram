# Preview System Troubleshooting - Quick Reference

## Issues & Solutions

### 1. "Dev server did not open a port within 120s"

```
Problem: Dev server started but didn't output port
```

**Checklist:**
- [ ] Does repo have `package.json`?
- [ ] Does `npm run dev` work locally?
- [ ] Check dev script in package.json
- [ ] Large repo? May need timeout increase
- [ ] Complex build? May take time

**Solutions:**
```bash
# Test locally first
git clone <repo>
cd <repo>
npm install
npm run dev
# Does it start? Does it show a port?
```

**Fix:**
- Verify dev script works locally
- Check for custom scripts that might not output port
- Repository might have broken dependencies

---

### 2. "Repository not found"

```
Problem: GitHub can't find the repository
```

**Checklist:**
- [ ] Owner name correct?
- [ ] Repository name correct?
- [ ] Branch name spelled right?
- [ ] Repository is public or token has access?
- [ ] User has permission?

**Solutions:**
```bash
# Verify repo exists
curl https://api.github.com/repos/{owner}/{repo}
# Should return 200 OK

# Verify branch exists
git ls-remote https://github.com/{owner}/{repo} {branch}
# Should show the branch
```

**Fix:**
- Double-check owner/repo spelling
- For private repos, ensure GitHub token has `repo` scope
- Verify branch exists (check git branch -a locally)

---

### 3. "Preview record not found"

```
Problem: Database can't find preview record
```

**Checklist:**
- [ ] Supabase connected?
- [ ] Schema table exists?
- [ ] RLS policies correct?
- [ ] Service role key set?

**Solutions:**
```bash
# Set up the schema
curl -X POST http://localhost:3001/api/setup/auto-preview-schema
```

Or manually in Supabase:
1. Go to SQL Editor
2. Run: `scripts/auto-preview-schema.sql`

**Fix:**
- Run schema setup
- Check SUPABASE_SERVICE_ROLE is set
- Verify database credentials

---

### 4. "Still waiting..." (>2 minutes)

```
Problem: Preview taking very long or frozen
```

**Normal for:**
- Large repos (>100MB)
- Many dependencies
- First preview of that repo
- Complex builds

**Probably broken if:**
- Diagnostics show errors
- Still waiting after 3 minutes
- GitHub check failed

**Solutions:**
```bash
# Option 1: Wait (might still work)
# Option 2: Click "Try Again" to restart
# Option 3: Test repo locally first
# Option 4: Try simpler repo first
```

---

### 5. "Cannot find module..." in browser

```
Problem: Preview loads but shows module errors
```

**Checklist:**
- [ ] All dependencies installed?
- [ ] Correct Node version?
- [ ] Lock file matches package.json?

**Solutions:**
```bash
# Repo might have issues
# Test locally
npm install
npm run dev

# Check for:
# - Missing dependencies
# - Wrong Node version
# - Incompatible packages
```

---

### 6. "API Error 500"

```
Problem: Backend API error
```

**Check:**
- [ ] GitHub token valid?
- [ ] Supabase connected?
- [ ] SPRITES_TOKEN set?
- [ ] Server logs for details

**Server logs:**
```bash
# Check for errors starting with [AutoPreview]
# or [SpritesService]
```

---

## Diagnostic Checklist

Before giving up, run through:

```
☐ 1. Authentication
    - Logged in?
    - Have access token?

☐ 2. Repository
    - Owner name correct?
    - Repo name correct?
    - Branch exists?
    - Public or have permission?

☐ 3. Repository Setup
    - Has package.json?
    - npm install works?
    - npm run dev works?
    - Dev server outputs port?

☐ 4. Backend Setup
    - SPRITES_TOKEN set?
    - GITHUB_ACCESS_TOKEN set?
    - SUPABASE configured?
    - Schema table exists?

☐ 5. Network
    - Internet connected?
    - Can access GitHub?
    - Can access Supabase?
```

---

## Step-by-Step Debug Process

### Step 1: Verify Repository Works Locally
```bash
git clone https://github.com/{owner}/{repo} --branch {branch}
cd {repo}
npm install
npm run dev
# Should show: listening on http://localhost:3000 (or similar)
# Copy the port number shown
```

### Step 2: Check Environment Variables
```bash
# In your .env or environment
SPRITES_TOKEN=               # Must be set
GITHUB_ACCESS_TOKEN=         # Must be set
SUPABASE_PROJECT_URL=        # Must be set
SUPABASE_SERVICE_ROLE=       # Must be set
NEXT_PUBLIC_SUPABASE_ANON=   # Must be set
```

### Step 3: Check Database
```bash
# In Supabase SQL Editor
SELECT * FROM auto_preview_instances LIMIT 1;
# Should return data if table exists
```

### Step 4: Try Simple Repository
```
Try: https://github.com/vercel/next.js/examples/getting-started
Try: https://github.com/facebook/react
Try: Any small public repo
```

### Step 5: Check Server Logs
Look for messages like:
- `[AutoPreview] Starting provisioning task`
- `[SpritesService]` logs
- Any error messages

---

## Advanced: Manual Testing

### Test API Directly
```bash
# Create preview manually
curl -X POST http://localhost:3001/api/auto-preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectId": "test-123",
    "owner": "vercel",
    "repo": "next.js",
    "branch": "canary"
  }'

# Poll for status
curl http://localhost:3001/api/auto-preview?projectId=test-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Sprites Token
```bash
# If you have curl and jq:
curl -H "Authorization: Bearer $SPRITES_TOKEN" \
  https://api.sprites.dev/v1/sprites
# Should return list of sprites (or empty)
# If 401: Token invalid
# If 403: Token expired
```

---

## When Nothing Works

1. **Check browser console** (F12 → Console tab)
   - Look for error messages
   - Note the error details

2. **Check server logs** (terminal running dev server)
   - Search for `[AutoPreview]` or `[SpritesService]`
   - Look for error timestamps

3. **Verify credentials**
   - GitHub token has `repo` scope
   - Sprites token is valid
   - Supabase credentials correct

4. **Try with known-good repo**
   - Use small, simple repository
   - Verify preview system works
   - Then try your repo

5. **Check environment**
   - Node.js version correct?
   - npm/pnpm/yarn working?
   - Internet connection stable?

---

## Getting Help

When reporting issues, include:

1. **Error message** (exact text)
2. **Repository** (owner/repo/branch)
3. **Steps taken** (what you did)
4. **Environment** (node version, package manager)
5. **Logs** (relevant error logs from server)

Example:
```
Error: "Dev server did not open a port within 120s"
Repo: facebook/react (main branch)
Steps: Clicked preview, waited 2 minutes, got timeout
Node: 18.17.0
npm: 9.8.1
Log: [SpritesService] Port detection timeout...
```

---

## Pro Tips

1. **Test locally first**
   - Always verify npm run dev works
   - Check that it outputs a port
   - Ensures repo is healthy

2. **Use public repos for testing**
   - GitHub/Vercel repos work great
   - Start simple, go complex
   - Proves system works

3. **Watch the diagnostics**
   - Shows exactly which step fails
   - Helps identify the root cause
   - Speed up debugging

4. **Check one thing at a time**
   - Network? Credentials? Repo setup?
   - Isolate the problem
   - Fix systematically

5. **Give it time**
   - Large repos really do take 2+ minutes
   - First preview is slower
   - Subsequent previews might be cached
