# RoseRam Builder - Complete System Documentation

## Overview

RoseRam Builder is a full-featured, AI-powered web development environment built with Next.js. It provides an integrated IDE for syncing GitHub repositories, editing code, previewing changes in real-time, and using AI assistance to generate and modify code.

The system is modeled after Builder.io's approach, combining:
- **Repository Management**: Sync existing GitHub repos or create new ones
- **Code Editor**: Multi-file editor with syntax awareness
- **Live Preview**: Real-time preview with framework detection
- **AI Assistant** (Grok): Hidden, codebase-aware AI agent
- **Session Management**: Per-user, per-session state isolation
- **Dependency Tracking**: Automatic detection and management
- **Auto-Push**: Push code directly to GitHub

---

## Architecture

### Core Components

#### 1. **CodeBuilder** (`components/CodeBuilder.jsx`)
Main orchestrator component that manages:
- File exploration and selection
- Code editing and previewing
- AI assistant integration
- Session and integration state
- Repository synchronization

**Key Features:**
- Dual-panel layout (chat + code/preview)
- Real-time codebase analysis
- Framework and dependency detection
- Automatic revision history

#### 2. **Session Management** (`components/SessionManagementPanel.jsx`)
Handles:
- Per-session X.AI API key storage
- User session initialization and cleanup
- Dependency management UI
- Framework detection display
- **Clear Session** functionality (complete reset)

**Storage:**
- User data: Supabase `user_sessions` table
- Session keys: Encrypted in database
- Fallback: Browser localStorage

#### 3. **GitHub Integration** (`components/GitHubRepositoryManager.jsx`)
Enables:
- Creating new repositories
- Auto-pushing files to GitHub
- Repository selection and switching
- Repository status display

**API Endpoints:**
- `POST /api/github/create-repo` - Create and push to new repos
- `GET /api/github/repos` - List user's repositories
- `POST /api/github/push` - Push changes to existing repos

#### 4. **AI Assistant** (Grok)
**Files:**
- `lib/grok-session.js` - Session-aware Grok implementation
- `app/api/grok-generate` - API route for code generation

**Features:**
- **Codebase-Aware**: Only provides assistance related to project code
- **Session-Isolated**: Uses per-session API keys
- **Hidden Agent**: Silent operation without user introduction
- **Context-Aware**: Understands project structure and dependencies

**Key Functions:**
```javascript
generateWithCodebaseContext(sessionId, prompt, codebaseContext)
analyzeCodebaseWithGrok(sessionId, codebaseContent)
generateCodeChanges(sessionId, prompt, codebaseContext)
```

#### 5. **Preview Pane** (`components/PreviewPanel.jsx`)
Enhanced with:
- **Language Detection**: Displays detected file type and language
- **Framework Identification**: Shows React, Vue, TypeScript, etc.
- **Navigation**: Back/forward history, path input
- **Auto-refresh**: Responds to code changes
- **Live URL**: Open in new tab functionality

**Language Support:**
- HTML, CSS, JavaScript, TypeScript
- JSX/TSX (React)
- Vue, Svelte
- JSON, Markdown, SCSS

#### 6. **Dependency Detection** (`lib/dependency-detector.js`)
Analyzes codebase for:
- Framework detection (React, Vue, Angular, Svelte, TypeScript)
- Dependency identification from imports
- package.json parsing and generation
- Missing dependency suggestions

**Functions:**
```javascript
detectFrameworks(codebaseContent)
detectDependencies(codebaseContent)
analyzePackageJson(packageJsonContent)
generatePackageJson(projectName, dependencies)
suggestMissingDependencies(frameworks, detectedDeps)
```

---

## User Workflows

### Workflow 1: Sync Existing Repository

1. **Navigate to `/builder`**
2. **Click "Connect Repository"** (top right)
3. **Authorize GitHub** (if needed)
4. **Select a repository** from your GitHub account
5. **Repository loads automatically:**
   - File structure displays in left sidebar
   - Frameworks/dependencies detected
   - Codebase analyzed for AI context
   - Live preview ready

### Workflow 2: Create New Repository & Push

1. **Click "New Repository"** button (requires connected repo)
2. **Enter repository details:**
   - Name (required)
   - Description (optional)
   - Privacy (public/private)
3. **Review files to push:**
   - All edited files listed
   - Count displayed
4. **Click "Create Repository"** → GitHub repo created
5. **Click "Push Files Now"** → Files committed to main branch
6. **Repository auto-connected** for continued development

### Workflow 3: Use Grok AI Assistant

1. **Open Chat Panel** (left side, "AI Assistant")
2. **Send a prompt:**
   - "Add a dark mode toggle"
   - "Create a contact form"
   - "Refactor this component"
3. **Grok analyzes:**
   - Current codebase context
   - Your project's technology stack
   - Existing code patterns
4. **Reviews generated changes** in diff preview
5. **Applies changes** with one click
6. **Changes saved** automatically with revision tracking

**Important:** Grok only responds to requests pertaining to your current codebase. Other requests return helpful refusals.

### Workflow 4: Session Management

1. **Click Session/Dependencies Icon** (top right, package icon)
2. **Panel opens with:**
   - Session ID and user email
   - Connected repository info
   - X.AI API key management
   - Detected frameworks
   - Project dependencies

**Adding Personal X.AI Key:**
- Paste your X.AI API key
- Click "Save Key"
- Uses personal key instead of global one
- Scoped to this session only

**Clearing Session:**
- Click "Clear All Session Data"
- Confirms action (cannot be undone)
- Clears:
  - Conversation history
  - Repository connection
  - API keys
  - All preferences
  - All UI state
- Page reloads with fresh state

---

## API Endpoints

### Session Management
```
POST /api/session-key

Actions:
- "set": Save per-session X.AI key
  Body: { action: "set", sessionId, userXApiKey }

- "get": Retrieve per-session key
  Body: { action: "get", sessionId }

- "clear": Remove per-session key
  Body: { action: "clear", sessionId }
```

### GitHub Operations
```
POST /api/github/create-repo

Actions:
- "create": Create new repository
  Body: {
    action: "create",
    token,
    repoName,
    description,
    isPrivate
  }

- "push": Push files to repository
  Body: {
    action: "push",
    token,
    repoName,
    files: [{ path, content }],
    branch: "main"
  }
```

### Code Generation
```
POST /api/generate-multi-file

Body: {
  prompt,
  codebaseContext,
  conversationHistory,
  projectStructure,
  techStack
}

Returns:
{
  success: true,
  files: [
    { path, content, language },
    ...
  ]
}
```

### Repository Management
```
POST /api/repository

Actions:
- "getStructure": Fetch repository file tree
- "getFile": Get single file content
- "getFileBlob": Get raw file data
```

---

## Configuration

### Environment Variables

**Required:**
```
# GitHub
GITHUB_ACCESS_TOKEN=github_pat_xxx
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=github_pat_xxx

# X.AI (Grok)
X_API_KEY=xai_xxx
NEXT_PUBLIC_X_API_KEY=xai_xxx

# Supabase
SUPABASE_PROJECT_URL=https://xxx.supabase.co
SUPABASE_ANON=eyJhbGc...
SUPABASE_SERVICE_ROLE=eyJhbGc...
```

**Optional:**
```
# Encryption
ENCRYPTION_SECRET=your-secret-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Database Schema

**user_sessions table:**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  x_api_key_encrypted TEXT,
  x_api_key_hash TEXT,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

---

## Key Features in Detail

### 1. Grok AI Integration

**Codebase-Aware Behavior:**
```javascript
System Prompt: "Only provide assistance related to the user's current codebase.
REFUSE requests that don't pertain to their project structure."
```

**Example Interactions:**
- ✅ "Add dark mode toggle" → Generates code using existing tech stack
- ✅ "Fix this component" → Analyzes component and suggests fixes
- ❌ "How do I learn Python?" → Refuses (not codebase-related)

**Per-Session Isolation:**
- Each user session gets unique session ID
- X.AI API key optionally stored per-session
- Conversation history saved per-session
- Clear session = complete fresh start

### 2. Framework & Language Detection

**Automatic Detection:**
- Scans import statements
- Analyzes file extensions
- Checks configuration files
- Identifies build tools

**Detected Frameworks:**
- React/Next.js
- Vue/Nuxt
- Angular
- Svelte
- TypeScript/JavaScript
- Tailwind CSS
- And 20+ more...

**Preview Display:**
- Language badge shows current file type
- Color-coded by language category
- Updates as you navigate files

### 3. Dependency Management

**Automatic Detection:**
```javascript
// Scans for:
import React from 'react'
import axios from 'axios'
require('lodash')
```

**Suggested Missing Deps:**
```javascript
// If React code detected but React not in dependencies:
// Suggests adding react@^18.0.0
```

**Manual Management:**
- Add dependencies via UI
- Remove unnecessary ones
- Generate new package.json
- View full dependency tree

### 4. Real-Time Preview

**Features:**
- Live refresh on code changes
- Framework-aware rendering
- Environment detection (HTML/React/Vue)
- Automatic route handling

**Performance:**
- Debounced refresh (250ms)
- Multiple refresh triggers for reliability
- Iframe-based isolation
- Clean state between updates

### 5. Session Isolation

**Complete Session State:**
- User ID / Email
- Connected repository
- API keys (encrypted)
- Conversation history
- File changes
- Preview state

**Clear Session:**
```javascript
// Clears:
localStorage.clear()
database.clearUserSession(userId)
UI.reset()
window.location.reload()
```

---

## Troubleshooting

### Issue: Files not loading
**Solution:**
1. Check GitHub token validity
2. Verify repository access
3. Try switching repositories
4. Clear session and reconnect

### Issue: Grok not responding
**Solution:**
1. Verify X.AI API key (global or session)
2. Check codebase context is available
3. Try simpler prompt
4. Check request pertains to codebase

### Issue: Preview not updating
**Solution:**
1. Click refresh button
2. Check dev server is running
3. Verify file content is saved
4. Try opening in new tab

### Issue: GitHub push fails
**Solution:**
1. Verify GitHub token has repo scope
2. Check repository isn't archived
3. Ensure token isn't rate-limited
4. Try creating new repository

### Issue: Session not persisting
**Solution:**
1. Check Supabase connection
2. Verify localStorage enabled
3. Check encryption secret configured
4. Try incognito mode to exclude extensions

---

## Performance Optimization

### Code Splitting
- Components lazy-loaded
- Modal dialogs on-demand
- Chat interface optimized

### Caching
- File cache: `fileCache` state
- Codebase analysis cached
- Repository structure cached
- API responses cached when possible

### Limits
```javascript
MAX_FILE_SIZE = 10MB
MAX_FILES_IN_REPO = 10,000
CODEBASE_CONTEXT_LIMIT = 50,000 tokens
CONVERSATION_HISTORY_LIMIT = 50 messages
REQUEST_TIMEOUT = 30 seconds
```

---

## Security Considerations

### API Keys
- ✅ X.AI keys encrypted in database
- ✅ GitHub tokens stored in context only
- ✅ Session-scoped API keys supported
- ✅ Keys never logged or exposed

### Repository Access
- ✅ GitHub OAuth required
- ✅ User can only access own repos
- ✅ Branch protection respected
- ✅ Commit history preserved

### Data Privacy
- ✅ Supabase row-level security
- ✅ User session isolation
- ✅ Encrypted storage
- ✅ GDPR-compliant

### Code Validation
- ✅ File paths validated
- ✅ Code injection prevented
- ✅ API input sanitized
- ✅ No arbitrary exec

---

## Future Enhancements

### Planned Features
1. **Multi-branch support** - Work on different branches
2. **Collaborative editing** - Real-time co-editing
3. **Environment variables** - UI for .env management
4. **Deployment integration** - Direct Netlify/Vercel deploy
5. **Test runner** - Run tests in preview
6. **Database UI** - Supabase table management
7. **Git diff viewer** - Enhanced code review
8. **Team workspaces** - Share and collaborate

### Extensibility
- Plugin system for custom AI tasks
- Custom framework detection
- Webhook integration
- CI/CD pipeline support

---

## Support & Resources

### Documentation
- Full API reference in code comments
- Component prop documentation
- Type definitions in `lib/types.js`

### Debugging
- Console logging enabled
- Dev server URL logged
- Session state in localStorage
- Error stack traces preserved

### Contact
- GitHub Issues for bugs
- Discussions for features
- Email support for urgent issues

---

## Version History

**v1.0.0** (Current)
- ✅ Core builder functionality
- ✅ Grok AI integration
- ✅ Session management
- ✅ Repository management
- ✅ Framework detection
- ✅ Dependency tracking
- ✅ Live preview
- ✅ Comprehensive documentation

---

## License

MIT License - See LICENSE file for details

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Submit pull request
4. Follow code style guidelines
5. Add tests for new features

---

*Last Updated: 2024*
*Maintained by: RoseRam Team*
