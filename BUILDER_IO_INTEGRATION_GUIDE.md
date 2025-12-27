# Builder.io Integration Guide for RoseRam Builder

## Instructions for Builder.io Team to Replicate/Integrate

This document provides step-by-step instructions for building a similar system within Builder.io or integrating RoseRam Builder with Builder.io.

---

## Part 1: Core System Architecture

### 1.1 Main Orchestrator Component

**File:** `components/CodeBuilder.jsx`

**Purpose:** Central hub managing all sub-systems

**Key Responsibilities:**
1. State management for:
   - Open/closed files
   - Current selection
   - Pending code changes
   - User session
   - Repository connection
   - Frameworks/dependencies detected

2. Integration points:
   - File system explorer
   - Code editor
   - Preview pane
   - AI chat interface
   - Session manager
   - Repository manager
   - Integration modal

3. Workflow coordination:
   - Load repository → Analyze codebase → Detect frameworks → Initialize preview
   - User writes prompt → Grok generates code → Show diff → Apply changes
   - User uploads files → Detect dependencies → Suggest missing packages
   - Click "Clear" → Reset all state → Fresh session

### 1.2 Component Tree

```
CodeBuilder (Main)
├── Header
│   ├── Menu toggle
│   ├── "New Repository" button
│   ├── Session/Dependencies icon
│   └── Settings button
├── Sidebar
│   └── FileExplorer
│       └── File tree rendering
├── Main Content
│   ├── Session Management Panel (collapsible)
│   ├── Error display
│   └── When repo connected:
│       ├── Left: Chat Interface
│       │   └── EnhancedPromptChat
│       │       └── Message history
│       │       └── Input field
│       │       └── Tech stack display
│       └── Right: Editor + Preview
│           ├── Code Editor (when file selected)
│           ├── Live Preview
│           └── File browser (when no file selected)
└── Modals
    ├── GitHub Repository Manager
    ├── Integration settings
    └── Diff preview (for generated code)
```

---

## Part 2: Key Features Implementation

### 2.1 Session-Aware Grok AI

**Files to Create/Modify:**
- `lib/grok-session.js` - Session-aware wrapper
- `app/api/session-key/route.js` - Key management API
- Update `app/api/grok-generate/route.js` to use session keys

**Implementation Steps:**

1. **Create Grok Session Module** (`lib/grok-session.js`)
   ```javascript
   export async function callGrokAPIWithSession(
     messages,
     sessionId,
     userXApiKey,
     model,
     maxTokens,
     topP
   )
   ```

2. **Add System Prompts**
   - `CODEBASE_AWARE`: Only help with current project
   - `HIDDEN_ASSISTANT`: No introduction, silent agent

3. **Implement Code Change Parsing**
   - Parse response into file blocks
   - Extract file paths
   - Detect languages

4. **API Route for Session Keys**
   - Endpoint: `POST /api/session-key`
   - Actions: set, get, clear
   - Encrypt keys before storage

**Usage in CodeBuilder:**
```javascript
// In handleEnhancedPrompt
const sessionKey = await fetchUserSessionKey(session.user.id);
const response = await generateWithCodebaseContext(
  session.user.id,
  promptText,
  codebaseContext,
  messageHistory,
  sessionKey // Pass per-session key
);
```

### 2.2 GitHub Repo Creation & Auto-Push

**File:** `app/api/github/create-repo/route.js`

**Implementation Steps:**

1. **Use Octokit Library**
   ```bash
   npm install octokit
   ```

2. **Two Actions:**
   - **Create:** Initialize new GitHub repository
   - **Push:** Commit and push files to repo

3. **Create Repo Logic**
   ```javascript
   const octokit = new Octokit({ auth: token });
   const { data: user } = await octokit.rest.users.getAuthenticated();
   const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
     name: repoName,
     description,
     private: isPrivate,
     auto_init: true
   });
   ```

4. **Push Files Logic**
   - Get current branch reference (latest commit SHA)
   - Create tree with new files
   - Create commit with tree
   - Update reference to point to new commit

5. **GitHubRepositoryManager Component**
   - Modal with repo creation form
   - Shows created repo details
   - File list preview
   - Push button

### 2.3 Dependency Detection & Management

**File:** `lib/dependency-detector.js`

**Core Functions:**

1. **detectFrameworks(codebaseContent)**
   - Pattern match: React, Vue, Angular, Svelte, TypeScript
   - Check imports and JSX syntax
   - Return array of framework names

2. **detectDependencies(codebaseContent)**
   - Scan for import/require statements
   - Match against known packages
   - Return structured dependency list

3. **analyzePackageJson(packageJsonContent)**
   - Parse JSON
   - Categorize dependencies
   - Extract scripts and metadata

4. **generatePackageJson(projectName, dependencies)**
   - Create new package.json structure
   - Include detected dependencies
   - Add default scripts

5. **suggestMissingDependencies(frameworks, detectedDeps)**
   - If React detected but not in deps → Suggest react@latest
   - If TypeScript patterns found but not installed → Suggest typescript

**Integration in CodeBuilder:**
```javascript
useEffect(() => {
  if (codebaseAnalysis) {
    const frameworks = detectFrameworks(codebaseContent);
    const deps = detectDependencies(codebaseContent);
    setFrameworks(frameworks);
    setDetectedDependencies(deps);
  }
}, [codebaseAnalysis]);
```

### 2.4 Session Management & Clear Button

**File:** `components/SessionManagementPanel.jsx`

**Features:**

1. **API Key Management**
   - Input field (masked password)
   - Show/hide toggle
   - Save button
   - Clear button
   - Status indicator

2. **Session Info Display**
   - User email
   - Session ID
   - Connected repo
   - Detected frameworks
   - Project dependencies

3. **Clear Session Button**
   - Confirmation dialog
   - Clears localStorage
   - Clears database records
   - Resets all UI state
   - Reloads page

**Implementation:**
```javascript
const handleClearSession = async () => {
  const confirmed = window.confirm('Clear all session data?');
  if (!confirmed) return;

  // Clear localStorage
  localStorage.clear();

  // Clear from database
  await fetch('/api/session-key', {
    method: 'POST',
    body: JSON.stringify({
      action: 'clear',
      sessionId: session.user.id
    })
  });

  // Reset state
  setXApiKey('');
  setFrameworks([]);
  setDependencies([]);

  // Reload
  window.location.reload();
};
```

### 2.5 Enhanced Preview with Language Detection

**File:** `components/PreviewPanel.jsx`

**Features:**

1. **Language Detection Function**
   ```javascript
   const detectLanguage = (path) => {
     const ext = path.split('.').pop().toLowerCase();
     return {
       html: 'HTML/orange',
       jsx: 'React/blue',
       tsx: 'React+TS/blue',
       vue: 'Vue/green',
       ts: 'TypeScript/blue',
       // etc...
     }[ext];
   };
   ```

2. **Language Badge**
   - Display current file language
   - Color-coded by type
   - Update as user navigates
   - Show icon + label

3. **Framework Awareness**
   - Detect React/Vue components
   - Identify TypeScript usage
   - Show build tools
   - Display version info

---

## Part 3: API Routes Summary

### Session Management
```
POST /api/session-key
├── set: Save per-session X.AI key
├── get: Retrieve per-session key
└── clear: Remove per-session key
```

### GitHub Integration
```
POST /api/github/create-repo
├── create: Create new repository
└── push: Push files to repository

GET /api/github/repos
└── List user's repositories
```

### Code Generation
```
POST /api/generate-multi-file
└── Generate code based on prompt + codebase context
```

### Repository Operations
```
POST /api/repository
├── getStructure: Get file tree
├── getFile: Get file content
└── getFileBlob: Get raw file
```

---

## Part 4: State Management Strategy

### CodeBuilder State Structure

```javascript
{
  // File management
  files: [],                          // File tree structure
  selectedFile: File | null,          // Currently open file
  fileCache: { path: content },       // In-memory file contents
  fileChanges: { path: change },      // Track modifications
  
  // UI State
  viewMode: 'split' | 'editor' | 'preview',
  sidebarOpen: boolean,
  showIntegrationModal: boolean,
  showSessionPanel: boolean,
  
  // Repository
  github: {
    token: string,
    repository: { owner, name, id, defaultBranch }
  },
  
  // Analysis & Detection
  codebaseAnalysis: object,           // From analyze-codebase API
  frameworks: string[],               // ['react', 'typescript']
  detectedDependencies: string[],    // npm packages
  
  // Preview & Generation
  previewPath: string,                // Current preview path
  previewHTML: string,                // HTML content
  pendingChanges: Change[],           // Generated code awaiting approval
  refreshTrigger: number,             // Forces iframe refresh
  
  // Session
  projectId: string,                  // Project identifier
  xApiKey: string | null,             // Optional session-scoped key
  
  // Async State
  loading: boolean,
  generating: boolean,
  error: string | null
}
```

### Data Flow

1. **Load Repository**
   - User selects repo
   - Fetch file structure
   - Analyze codebase
   - Detect frameworks/deps
   - Ready for editing/preview

2. **Edit File**
   - User opens file
   - Load content into cache
   - Track changes
   - Save triggers revision

3. **Use AI**
   - User sends prompt
   - Fetch codebase context
   - Send to Grok with context
   - Parse response into files
   - Show diff preview
   - Apply on confirm

4. **Push to GitHub**
   - Collect modified files
   - Create repo
   - Push all files
   - Auto-connect repo
   - Continue development

5. **Clear Session**
   - Prompt confirmation
   - Clear all state
   - Clear database
   - Clear localStorage
   - Reload page

---

## Part 5: Integration with Builder.io Visual Builder

### Option A: Embed in Builder Page

1. **Create Builder Page**
   - Use `<CodeBuilder />` component
   - Configure as modal or full-page
   - Add to navigation

2. **Link from Builder Content**
   - Add button in page editor
   - "Open in Code Builder" action
   - Pass context (project ID, etc.)

3. **Two-Way Sync** (Optional)
   - Save code from Builder → CodeBuilder
   - Update Builder from CodeBuilder
   - Keep in sync with API calls

### Option B: Standalone Integration

1. **Deploy CodeBuilder separately**
   - At `/builder` route
   - Accessible via URL
   - Independent of Builder CMS

2. **Link from Builder.io Dashboard**
   - Quick action buttons
   - Open recent projects
   - Create new project

### Option C: Full Integration

1. **Use Builder.io models for**
   - Project metadata
   - File storage
   - Revision history
   - Collaboration data

2. **Extend CodeBuilder**
   - Import Builder SDK
   - Use Builder API endpoints
   - Store data in Builder models
   - Share via Builder permissions

---

## Part 6: Configuration Checklist

### Environment Variables
```
# Authentication
GITHUB_ACCESS_TOKEN=
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=

# AI
X_API_KEY=
NEXT_PUBLIC_X_API_KEY=

# Database
SUPABASE_PROJECT_URL=
SUPABASE_ANON=
SUPABASE_SERVICE_ROLE=

# App
NEXT_PUBLIC_APP_URL=

# Security
ENCRYPTION_SECRET=
```

### Database Tables
```sql
-- user_sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  x_api_key_encrypted TEXT,
  x_api_key_hash TEXT,
  updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
```

### Dependencies to Install
```bash
npm install octokit
npm install zustand           # State management
npm install lucide-react      # Icons
npm install tailwindcss       # Styling
npm install @supabase/supabase-js
```

---

## Part 7: Testing & Validation

### Unit Tests
- Test framework detection patterns
- Test dependency parsing
- Test session key encryption
- Test GitHub API calls

### Integration Tests
- Test full workflow: repo → edit → generate → push
- Test session isolation
- Test clear session completely resets
- Test Grok respects codebase context

### E2E Tests
- User can sync repo
- User can edit files
- User can get AI suggestions
- User can create/push repo
- User can clear session

---

## Part 8: Performance Considerations

### Optimization Strategies
1. **Lazy load components**
   - Modals loaded on-demand
   - Chat interface optimized
   - Preview deferred

2. **Cache aggressively**
   - File contents in state
   - Codebase analysis cached
   - Framework detection cached

3. **Debounce & throttle**
   - Preview refresh: 250ms debounce
   - API calls rate-limited
   - Socket connections pooled

4. **Limits & Safeguards**
   - Max 10MB per file
   - Max 10,000 files per repo
   - 50,000 token context limit
   - 30-second request timeout

---

## Part 9: Security Best Practices

### API Key Handling
✅ **DO:**
- Encrypt keys at rest
- Hash keys for lookup
- Session-scope keys
- Rotate keys periodically
- Log access attempts

❌ **DON'T:**
- Log full keys
- Expose in URLs
- Send in plain text
- Store in localStorage
- Share between sessions

### Repository Access
✅ **DO:**
- Verify GitHub token
- Check repository ownership
- Respect branch protection
- Preserve commit history
- Log all changes

❌ **DON'T:**
- Force push without warning
- Delete branches silently
- Modify history
- Bypass permissions
- Access other users' repos

### Code Execution
✅ **DO:**
- Validate all file paths
- Sanitize input
- Type-check responses
- Limit file sizes
- Timeout requests

❌ **DON'T:**
- Execute arbitrary code
- Run shell commands
- Trust user input
- Store secrets in code
- Expose environment

---

## Part 10: Troubleshooting Guide

### Common Issues & Solutions

**Issue:** Files don't load from GitHub
- Check token validity/scopes
- Verify repo accessibility
- Check branch existence
- Verify API rate limits

**Issue:** Grok won't respond to requests
- Verify X.AI API key active
- Check request pertains to codebase
- Try simpler prompt
- Check context availability

**Issue:** Push to GitHub fails
- Verify token scope includes "repo"
- Check repo isn't archived
- Ensure branch exists
- Verify rate limits

**Issue:** Preview doesn't update
- Refresh manually
- Check dev server running
- Verify file saved
- Check console errors

**Issue:** Session not persisting
- Check Supabase connection
- Verify encryption secret set
- Try clearing browser cache
- Check localStorage enabled

---

## Part 11: Deployment Considerations

### Hosting Options
- **Vercel**: Built for Next.js, automatic deployments
- **Netlify**: Easy deployment, good integrations
- **Docker**: Custom deployment, full control
- **AWS**: Scalable, enterprise features

### Database
- **Supabase**: Recommended (PostgreSQL + Auth)
- **Firebase**: Alternative (Firestore)
- **MongoDB**: NoSQL alternative

### CDN & Caching
- **Vercel CDN**: Auto with Vercel
- **Cloudflare**: CDN for all hostings
- **S3**: Large file storage

### Monitoring
- **Sentry**: Error tracking
- **LogRocket**: User sessions
- **New Relic**: Performance
- **Datadog**: Full monitoring

---

## Part 12: Advanced Features (Future)

### Planned Enhancements
1. **Multi-branch support**: Work on different branches
2. **Collaboration**: Real-time co-editing with others
3. **Deployment**: Direct deploy to Vercel/Netlify
4. **Environment**: Manage .env variables UI
5. **Testing**: Run tests in preview
6. **Database**: Supabase table management
7. **Teams**: Shared workspaces and permissions
8. **Plugins**: Custom AI tasks and integrations

---

## Summary

RoseRam Builder provides a complete, production-ready development environment combining:

1. ✅ **Repository Management** - Sync or create GitHub repos
2. ✅ **Code Editing** - Multi-file editor with syntax awareness
3. ✅ **AI Assistant** - Grok with codebase context
4. ✅ **Live Preview** - Real-time updates with framework detection
5. ✅ **Session Management** - Per-user, per-session isolation
6. ✅ **Dependency Tracking** - Automatic detection & management
7. ✅ **Auto-Push** - One-click GitHub pushes

All components are modular, well-documented, and ready for integration with Builder.io or deployment as standalone system.

---

**For Questions or Support:**
- Review `BUILDER_SYSTEM_COMPLETE.md` for full API documentation
- Check component prop types and comments
- Run tests and review test cases
- Examine git history for implementation decisions
