# Roseram Builder - Complete Architecture

## Application Flow

```
User Entry
    ↓
/setup (SetupFlow)
    ├─ GitHub Integration (authenticate + select repo)
    ├─ Supabase Integration (configure database)
    └─ Continue to Builder
    ↓
/builder (RepoExplorer)
    ├─ Initialize Authentication (useAuth)
    ├─ Load GitHub Repository Structure
    ├─ Create/Select Project (in Supabase)
    └─ Main Code Editing Interface
         ├─ Left Panel: File Explorer
         ├─ Top Right: Code Viewer
         └─ Bottom Right: Chat + History
              ├─ Chat: Code Generation Interface
              │   ├─ User enters prompt
              │   ├─ Sends to /api/grok-generate
              │   ├─ Receives code from Grok xAI
              │   ├─ Creates action in database
              │   └─ Displays code in editor
              └─ History: Action Tracking
                  ├─ Lists all past actions
                  ├─ Click to view code
                  ├─ Revert individual actions
                  └─ Rollback to any state
```

## Authentication Flow

```
User
    ↓
AuthProvider (lib/integrations-context.tsx)
    ├─ Load session from Supabase
    ├─ Persist to localStorage
    └─ Provide to entire app via useAuth()
    ↓
Components use:
    const { session } = useAuth()
    ├─ session.user.id → userId
    ├─ session.access_token → Authorization header
    └─ session.user.email → user info
```

## Database Schema

### Tables

#### projects
```sql
id UUID PRIMARY KEY
user_id UUID -- FK to auth.users
name VARCHAR(255)
description TEXT
status 'draft'|'active'|'archived'
github_url VARCHAR(500)
netlify_url VARCHAR(500)
github_branch VARCHAR(255)
generated_code JSONB -- {html, css, javascript}
created_at TIMESTAMP
updated_at TIMESTAMP
last_generated TIMESTAMP
```

#### actions
```sql
id UUID PRIMARY KEY
project_id UUID -- FK to projects
user_id UUID -- FK to auth.users
action_type 'generation'|'edit'|'revert'|'save'
description TEXT -- the prompt or change description
file_path VARCHAR(500)
code_content TEXT -- the code that was generated/edited
metadata JSONB -- {prompt, language, model, etc}
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### code_versions
```sql
id UUID PRIMARY KEY
action_id UUID -- FK to actions
file_path VARCHAR(500) -- which file this version is for
code_content TEXT -- the code at this version
language VARCHAR(50) -- typescript, javascript, python, etc
created_at TIMESTAMP
```

#### history_snapshots
```sql
id UUID PRIMARY KEY
project_id UUID -- FK to projects
action_id UUID -- FK to actions
snapshot_index INTEGER -- sequential order
files_snapshot JSONB -- complete project state {path: code, ...}
created_at TIMESTAMP
```

### RLS Policies

All tables have Row Level Security:
- Users can only view/edit their own projects and actions
- `user_id` field ensures isolation

## API Endpoints

### Authentication
```
GET /api/auth/session → Session info
POST /api/auth/signup → Create account
POST /api/auth/login → Login
POST /api/auth/logout → Logout
```

### Projects
```
GET /api/projects → List user's projects
POST /api/projects → Create new project
  {name, description, github_url, netlify_url}
GET /api/projects/{id} → Get specific project
PATCH /api/projects/{id} → Update project
DELETE /api/projects/{id} → Delete project
```

### Actions (NEW)
```
POST /api/actions
  action: "create" | "getHistory" | "revert" | "rollback"
  
  create:
    {projectId, actionType, description, filePath, codeContent, metadata}
    → Creates action + code version + snapshot
    
  getHistory:
    {projectId}
    → Returns all actions for project
    
  revert:
    {projectId, actionId}
    → Reverts specific action, returns previous code state
    
  rollback:
    {projectId, snapshotIndex}
    → Rolls back to specific snapshot
```

### Code Generation
```
POST /api/grok-generate
  {prompt, context: {language, filePath, existingCode}}
  → Returns generated code from Grok xAI
```

### Repository
```
POST /api/repository
  action: "getStructure" | "getFile" | "push"
  → Manage GitHub repository files
```

## Component Hierarchy

```
RootLayout (app/layout.tsx)
    └─ IntegrationProvider (provides github, supabase context)
         └─ AuthProvider (provides session, auth methods)
              └─ BuilderPage (app/builder/page.tsx)
                   └─ RepoExplorer (components/RepoExplorer.tsx)
                        ├─ File Explorer (top-left)
                        ├─ Code Viewer (top-right)
                        ├─ CodeGeneratorChat (bottom-left)
                        │   └─ Generated Code Display
                        │   └─ History Sidebar
                        │   └─ Prompt Input
                        └─ ActionHistory (bottom-right)
                             └─ Action Timeline
                             └─ Revert Buttons
                             └─ Rollback Controls
```

## Data Flow

### Code Generation Flow

```
User types prompt in CodeGeneratorChat
    ↓
User clicks "Generate"
    ↓
Frontend sends to /api/grok-generate
    ├─ prompt: "Create a button component"
    ├─ context: {language: "typescript", filePath: "Button.tsx", existingCode}
    ↓
API sends to Grok xAI with system prompt
    ├─ System: "You are an expert code generator..."
    ├─ Model: grok-beta
    ��─ Temperature: 0.3
    ├─ Max tokens: 4096
    ↓
Grok returns generated code
    ↓
Frontend creates action via /api/actions
    ├─ action: "create"
    ├─ actionType: "generation"
    ├─ description: prompt
    ├─ codeContent: generated code
    ├─ metadata: {prompt, language, model}
    ↓
API creates in database:
    ├─ Insert into actions table
    ├─ Insert code version
    ├─ Create history snapshot
    ↓
Frontend displays code in editor
    └─ Code appears in CodeViewer section
```

### Revert Flow

```
User clicks revert button on past action
    ↓
ActionHistory calls handleRevertAction(actionId)
    ↓
Sends to /api/actions with action: "revert"
    ├─ projectId
    ├─ actionId
    ↓
API:
    ├─ Fetches action details
    ├─ Gets code_versions for that action
    ├─ Returns previous file states
    ├─ Creates new "revert" action record
    ↓
Frontend:
    ├─ Receives file states
    ├─ Calls handleRevert(actionId, fileStates)
    ├─ Updates code editor with previous content
    ├─ Refreshes action history
```

### Rollback Flow

```
User clicks rollback button on older action
    ↓
ActionHistory calls handleFullRollback(snapshotIndex)
    ↓
Sends to /api/actions with action: "rollback"
    ├─ projectId
    ├─ snapshotIndex
    ↓
API:
    ├─ Fetches history snapshot at index
    ├─ Returns complete files_snapshot (all files at that time)
    ├─ Creates "revert" action record
    ↓
Frontend:
    ├─ Receives all file states
    ├─ Restores each file to previous state
    ├─ Updates code editor
    ├─ Refreshes action history
```

## State Management

### Global Context (lib/integrations-context.tsx)
```typescript
IntegrationContext {
  github: {
    token: string
    repository: Repository | null
    setRepository: (repo) => void
    setToken: (token) => void
  }
  supabase: {
    url: string
    key: string
    schema: SchemaInfo | null
    setCredentials: (url, key) => void
    setSchema: (schema) => void
  }
  isSetupComplete: boolean
}
```

### Auth Context (components/AuthProvider.tsx)
```typescript
AuthContext {
  session: Session | null  // {user, access_token, refresh_token}
  loading: boolean
  isConfigured: boolean
}
```

### Local Component State (RepoExplorer)
```typescript
const [files, setFiles] = useState<FileItem[]>([])
const [selectedFile, setSelectedFile] = useState<FileContent | null>(null)
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
const [projectId, setProjectId] = useState<string | null>(null)
```

### CodeGeneratorChat State
```typescript
const [prompt, setPrompt] = useState("")
const [generatedBlocks, setGeneratedBlocks] = useState<GeneratedCodeBlock[]>([])
const [isGenerating, setIsGenerating] = useState(false)
const [showHistory, setShowHistory] = useState(false)
const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
```

### ActionHistory State
```typescript
const [actions, setActions] = useState<Action[]>([])
const [expandedActionId, setExpandedActionId] = useState<string | null>(null)
const [isReverting, setIsReverting] = useState(false)
const [error, setError] = useState<string | null>(null)
```

## Error Handling

### Authentication Errors
```
Missing token → AuthenticationError (401)
Invalid token → AuthenticationError (401)
Token expired → User redirected to /setup
```

### Validation Errors
```
Missing required fields → ValidationError (400)
Invalid input format → ValidationError (400)
Project not found → NotFoundError (404)
```

### Grok API Errors
```
API rate limit → Error message in chat
Invalid model → Error message in chat
Connection timeout → Retry option
```

### Database Errors
```
Supabase down → Graceful fallback (default-project)
RLS violation → Error to console
Connection error → Retry with exponential backoff
```

## Security Considerations

1. **Authentication**
   - Supabase Auth handles user sessions
   - JWT tokens validated server-side
   - Access tokens included in API requests

2. **Authorization**
   - RLS policies ensure user isolation
   - `user_id` field on all user-owned tables
   - Server-side verification of permissions

3. **Secrets**
   - API keys in environment variables
   - GitHub tokens stored in localStorage (local only)
   - Supabase keys never exposed client-side
   - Grok API key in `.env.local` only

4. **Code Generation**
   - User prompts logged in metadata
   - Generated code not automatically executed
   - Code review recommended before deployment

## Performance Optimizations

1. **Database**
   - Indexed columns: project_id, user_id, created_at
   - Pagination on history queries (limit 100)
   - Snapshots for O(1) rollback

2. **Frontend**
   - Code blocks memoized
   - History virtualized (only render visible items)
   - Lazy load file content
   - Debounce file explorer search

3. **API**
   - Grok requests have timeout
   - Repository structure cached in memory
   - Action creation batched if multiple
   - Response compression enabled

## Deployment

### Environment Variables Required
```
# Supabase
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=eyJhbGc...
SUPABASE_SERVICE_ROLE=eyJhbGc... (server-only)

# Grok xAI
NEXT_PUBLIC_X_API_KEY=xai_...

# GitHub
NEXT_PUBLIC_GITHUB_ACCESS_TOKEN=ghp_...

# Netlify (optional)
NEXT_PUBLIC_NETLIFY_ACCESS_TOKEN=nfp_...
NEXT_PUBLIC_NETLIFY_SITE_ID=...
```

### Database Setup
```bash
1. Go to Supabase SQL Editor
2. Run: scripts/create-actions-schema.sql
3. Verify tables created
4. Test RLS policies
```

### Deploy
```bash
# Build
npm run build

# Test build
npm run start

# Deploy to Netlify/Vercel
# Ensure environment variables are set
```

## Monitoring & Logs

### Client-Side Logs
```typescript
[RepoExplorer] Loading repository...
[CodeGeneratorChat] Generating code...
[ActionHistory] Action reverted successfully
```

### Server-Side Logs
```typescript
[Grok] API request sent
[Actions API] Action created with ID: xyz
[Database] Query completed in 45ms
```

### Errors to Monitor
- Failed authentications
- Grok API timeouts
- Database constraint violations
- Missing environment variables

## Future Enhancements

- [ ] Real-time collaboration with WebSockets
- [ ] Code diff viewer between versions
- [ ] Automatic code formatting/linting
- [ ] Multiple language support
- [ ] Custom system prompts
- [ ] Integration with other AI models
- [ ] Team project sharing
- [ ] Export as GitHub pull request
- [ ] Code review workflow
- [ ] Deployment automation
