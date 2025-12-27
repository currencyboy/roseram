# Roseram Builder - Architecture Documentation

## System Overview

Roseram Builder is a modern web application that uses AI to generate production-ready web code from natural language prompts, with integrated deployment capabilities to GitHub and Netlify.

```
┌─────────────────┐
│   Web Browser   │
│  (Next.js App)  │
└────────┬────────┘
         │
    HTTP │ HTTPS
         ▼
┌─────────────────────────────────────┐
│     Next.js Server & API Routes     │
├────────────────────────���────────────┤
│ - Authentication (Supabase)         │
│ - Code Generation (/api/generate)   │
│ - GitHub Integration (/api/github)  │
│ - Netlify Integration (/api/netlify)│
└────┬──────┬──────┬──────────────────┘
     │      │      │
     ▼      ▼      ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐
│Supabase │ │ X_API    │ │GitHub/      │
│(Auth &  │ │(Grok -   │ │Netlify APIs │
│DB)      │ │Code Gen) │ │             │
└─────────┘ └──────────┘ └─────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Fetch API

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **External APIs**:
  - X.AI API (Grok for code generation)
  - GitHub API (Octokit)
  - Netlify API

### Infrastructure
- **Hosting**: Netlify
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Domain**: roseram.com (DNS + HTTPS)

## Directory Structure

```
roseram-builder/
├── app/
│   ├── api/                           # API Routes
│   │   ├── generate/route.ts          # Code generation endpoint
│   │   ├── github/
│   │   │   └── push/route.ts          # GitHub push endpoint
│   │   ├── netlify/
│   │   │   └── deploy/route.ts        # Netlify deploy endpoint
│   │   └── setup/route.ts             # One-time setup endpoint
│   ├── dashboard/
│   │   ├── layout.tsx                 # Protected layout
│   │   └── page.tsx                   # Main dashboard
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Login page
│   └── globals.css                    # Global styles
│
├── components/                        # React Components
│   ├── AuthProvider.tsx               # Auth context
│   ├── LoginForm.tsx                  # Login component
│   ├── PromptInput.tsx                # Code prompt input
│   ├── CodeEditor.tsx                 # Code editor & preview
│   └── DeploymentPanel.tsx            # Deploy controls
│
├── lib/                               # Utilities & Helpers
│   ├── supabase.ts                    # Supabase client setup
│   ├── auth.ts                        # Auth functions
│   └── types.ts                       # TypeScript types
│
├── scripts/
│   └── setup-auth.js                  # Admin user setup
│
├── public/                            # Static assets
├── .env.local.example                 # Environment template
├── next.config.ts                     # Next.js config
├── tailwind.config.ts                 # Tailwind config
├── tsconfig.json                      # TypeScript config
├── netlify.toml                       # Netlify config
├── README.md                          # Project README
├── DEPLOYMENT.md                      # Deployment guide
├── ARCHITECTURE.md                    # This file
└── package.json                       # Dependencies
```

## Core Modules

### 1. Authentication System

**File**: `lib/auth.ts`, `components/AuthProvider.tsx`

Handles user authentication using Supabase Auth:

```typescript
// Flow:
1. User enters credentials on login page
2. SignIn function calls Supabase auth
3. Session stored in browser context
4. Protected routes use AuthProvider guard
5. Logout clears session and redirects
```

**Key Functions**:
- `signIn(email, password)` - Authenticate user
- `signOut()` - Clear session
- `getSession()` - Retrieve current session
- `useAuth()` - React hook for auth context

### 2. Code Generation Engine

**File**: `app/api/generate/route.ts`

Leverages Grok AI to generate HTML/CSS/JavaScript:

```typescript
// Flow:
1. Frontend sends prompt to /api/generate
2. Backend creates system + user message
3. X.AI API (Grok) processes request
4. Response parsed into HTML/CSS/JS blocks
5. Code sent back to frontend
6. Frontend renders preview
```

**Prompt Engineering**:
- System prompt guides Grok to generate clean code
- Expects structured response with code blocks:
  - \`\`\`html ... \`\`\`
  - \`\`\`css ... \`\`\`
  - \`\`\`javascript ... \`\`\`

**Model**: grok-2-latest
**Temperature**: 0.7 (balanced creativity/consistency)
**Max Tokens**: 4000

### 3. GitHub Integration

**File**: `app/api/github/push/route.ts`

Pushes generated code to GitHub repositories:

```typescript
// Flow:
1. User provides repo URL and GitHub token
2. Extract owner/repo from URL
3. Use Octokit to authenticate
4. Get latest commit from target branch
5. Create/update file with generated code
6. Commit with message
7. Return commit SHA and URL
```

**Authentication**: Personal Access Token
**Scope**: repo (read/write access)
**File**: Typically index.html

**Error Handling**:
- Invalid repo URL detection
- Token validation
- File existence checking
- Branch verification

### 4. Netlify Deployment

**File**: `app/api/netlify/deploy/route.ts`

Deploys code directly to Netlify sites:

```typescript
// Flow:
1. User provides Netlify site ID and token
2. Combine HTML, CSS, JS into single file
3. Make deploy request to Netlify API
4. Polling for deployment status
5. Return live URL when ready
```

**Authentication**: Access Token
**Deployment Method**: Direct file deployment
**File Format**: index.html with embedded styles & scripts

**Response Includes**:
- Deploy ID
- Live URL (auto-generated domain)
- Deployment status

### 5. Database Schema

**Supabase Tables**:

```sql
-- Users table (managed by Supabase Auth)
auth.users
├── id (uuid)
├── email (text)
├── encrypted_password (text)
├── email_confirmed_at (timestamp)
└── ...

-- Projects table (for future use)
public.projects
├── id (uuid)
├── user_id (uuid, FK to auth.users)
├── name (text)
├── description (text)
├── generated_code (text)
├── github_url (text)
├── netlify_url (text)
├── created_at (timestamp)
└── updated_at (timestamp)

-- Chat history (for future use)
public.chat_messages
├── id (uuid)
├── project_id (uuid, FK to projects)
├── role (text) -- 'user' | 'assistant'
├── content (text)
├── created_at (timestamp)
└── tokens_used (integer)
```

## Data Flow

### Authentication Flow

```
Login Page
    ↓
LoginForm Component
    ↓
supabase.auth.signInWithPassword()
    ↓
[Valid Credentials?]
    ├→ No: Show Error
    └→ Yes: Store Session
         ↓
      Redirect to Dashboard
         ↓
      AuthProvider reads session
         ↓
      Render protected content
```

### Code Generation Flow

```
User enters prompt
    ↓
PromptInput (Frontend)
    ↓
POST /api/generate
    ↓
[Backend Processing]
  - Create X_API request
  - Call Grok AI API
  - Parse response
    ↓
Response with code
    ↓
CodeEditor displays:
  - Live preview (iframe)
  - HTML editor
  - CSS editor
  - JS editor
    ↓
User can edit code
    ↓
Ready to deploy
```

### Deployment Flow

```
Generated Code
    ↓
[User chooses deploy target]
    ├→ GitHub
    │  ├ Provide credentials
    │  ├ POST /api/github/push
    │  ├ Octokit pushes to repo
    │  └ Show commit URL
    │
    └→ Netlify
       ├ Provide credentials
       ├ POST /api/netlify/deploy
       ├ Netlify builds and deploys
       └ Show live URL
```

## Error Handling

### Global Error Handling

All API routes follow consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical details (dev only)"
}
```

### Common Error Scenarios

**Authentication Errors**:
- Missing/invalid credentials → 401 Unauthorized
- Session expired → Redirect to login
- Insufficient permissions → 403 Forbidden

**API Errors**:
- X_API failures → 500 with details
- GitHub token invalid → 401
- Netlify deployment failed → 500
- Invalid input → 400 Bad Request

**Network Errors**:
- Timeout handling (30s limit)
- Retry logic not yet implemented
- Fallback messages shown to user

## Security Considerations

### 1. Environment Variables

- Never expose secrets in code
- Use environment variables for all credentials
- Netlify dashboard manages production secrets
- Development: .env.local (gitignored)

### 2. API Route Security

- All routes validate input
- CORS headers configured
- Rate limiting recommended (not yet implemented)
- Service key only used server-side

### 3. Authentication

- Supabase handles password hashing
- JWT tokens in secure HTTP-only cookies
- Session validation on every request
- Auto-logout after inactivity

### 4. Data Protection

- HTTPS required for production
- Database encryption at Supabase
- User data isolation by user_id
- No sensitive data logged

## Performance Optimization

### Frontend

- Code splitting (Next.js automatic)
- Image optimization (via Next.js)
- CSS minification (Tailwind)
- JavaScript minification (build process)

### Backend

- Async/await for non-blocking operations
- Connection pooling (via Supabase)
- API response caching (partial)
- Request timeout handling

### Deployment

- CDN for static assets (Netlify)
- Automatic compression (gzip, brotli)
- Cache headers configured
- DDoS protection (Netlify)

## Scalability Considerations

### Current Limitations

- No multi-turn conversations yet
- No project history in DB
- Limited error recovery
- Single file deployment only

### Future Improvements

- Database for projects & history
- WebSocket for real-time updates
- Message queue for long deployments
- Caching layer (Redis)
- Microservices for AI processing
- Rate limiting & quotas

## Monitoring & Logging

### Available Metrics

- API response times
- Error rates
- Deployment success rate
- Code generation quality
- User session metrics

### Logging Strategy

- API requests logged (dev mode)
- Error tracking (integration ready)
- Deployment status logged
- User actions tracked (optional)

### Recommended Integrations

- **Sentry** for error tracking
- **LogRocket** for session replay
- **Mixpanel** for analytics
- **New Relic** for APM

## Testing Strategy

### Unit Tests
- Auth utility functions
- Code parsing logic
- Type definitions

### Integration Tests
- API endpoint functionality
- Database operations
- External API mocking

### E2E Tests
- Full user flow (login → generate → deploy)
- Error scenarios
- Edge cases

### Not Yet Implemented
- Automated test suite
- CI/CD pipeline testing
- Load testing

## Future Roadmap

### Phase 1 (Current MVP)
✅ Authentication
✅ Code generation
✅ GitHub integration
✅ Netlify integration

### Phase 2 (Planned)
- Project management (list, save, load)
- Multi-turn conversations
- Code history & versioning
- User preferences

### Phase 3 (Future)
- Team collaboration
- Custom components library
- Advanced AI features
- Analytics dashboard

### Phase 4 (Long-term)
- Mobile app
- Self-hosted option
- Enterprise features
- API for third-parties

## Development Notes

### Key Dependencies

- **@supabase/supabase-js** v2.38.0 - Database & Auth
- **octokit** v3.0.0 - GitHub API client
- **axios** v1.6.0 - HTTP client
- **next** v15.0.0 - Framework
- **react** v19.0.0 - UI library
- **tailwindcss** v3.4.0 - Styling

### Configuration Files

- `next.config.ts` - Next.js build config
- `tailwind.config.ts` - Tailwind CSS config
- `tsconfig.json` - TypeScript config
- `netlify.toml` - Netlify deployment
- `.env.local` - Development secrets

### Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
npm run setup-auth  # Initialize admin user
```

## Troubleshooting Guide

### Build Issues
- Check Node version (18+)
- Clear .next folder
- Reinstall dependencies
- Check environment variables

### Runtime Issues
- Check browser console for errors
- Verify API responses in Network tab
- Check Supabase connection
- Review server logs in Netlify

### Deployment Issues
- Verify build passes locally
- Check environment variables
- Review Netlify build logs
- Test API endpoints
