# Roseram Enterprise Setup Guide

## Overview
Roseram Builder is now configured as an enterprise platform with full MCP integrations, unrestricted environment variables, and repository management capabilities.

## Domain Setup

### roseram.com Configuration
1. **DNS Records**: Point to your deployment infrastructure
   ```
   Type    Name    Value
   A       @       [Your IP or CDN]
   CNAME   www     @
   ```

2. **Environment Variable**
   ```bash
   ROSERAM_DOMAIN=roseram.com
   ```

## Enterprise Features

### 1. MCP Integrations
Connect enterprise tools for seamless development:

- **Supabase**: Database & authentication
- **Netlify**: Hosting & continuous deployment
- **GitHub**: Repository management & version control

Each integration requires credentials that can be configured via:
1. Environment variables (`.env.local`)
2. Web UI (Settings → Integrations)
3. API endpoint (`/api/env-config`)

### 2. Team Management
- Invite team members
- Role-based access control
- Activity tracking per user

### 3. Billing & Token Tracking
- Real-time token usage monitoring
- Cost tracking per operation
- Configurable limits:
  - `MAX_TEAM_MEMBERS` (default: 50)
  - `DAILY_TOKEN_LIMIT` (default: 1,000,000)

### 4. Code Generation
Uses X API (Grok) for real-time code generation with:
- HTML/CSS/JavaScript extraction
- Framework detection
- Dependency analysis
- Token counting

### 5. Repository Operations
Direct GitHub integration for:
- Creating new repositories
- Pushing generated code
- Managing branches
- Automated commits

## Environment Variables

### Required
```bash
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_ANON=your_anon_key
SUPABASE_SERVICE_ROLE=your_service_role_key
X_API_KEY=xai_your_grok_api_key
```

### Optional (MCP Integrations)
```bash
VITE_NETLIFY_ACCESS_TOKEN=your_netlify_token
VITE_NETLIFY_SITE_ID=your_site_id
GITHUB_ACCESS_TOKEN=ghp_your_github_token
```

### Enterprise Configuration
```bash
ROSERAM_DOMAIN=roseram.com
MAX_TEAM_MEMBERS=50
DAILY_TOKEN_LIMIT=1000000
ADMIN_EMAIL=admin@roseram.com
ADMIN_PASSWORD=your_secure_password
```

### Custom Variables
Support any custom environment variables via:
1. `.env.local` file
2. Web UI Settings panel
3. `/api/env-config` endpoint

**No restrictions on variable names or values.**

## API Endpoints

### Code Generation
```bash
POST /api/generate
POST /api/generate-advanced
```

### Repository Management
```bash
POST /api/repository
  - action: "list" | "create" | "push"
  - owner, repo, path, content, message
```

### Environment Configuration
```bash
GET /api/env-config
POST /api/env-config
  - action: "set" | "get"
  - key, value
```

## Usage Flow

### 1. Login
```
Email: admin@roseram.com
Password: PAssword123!!!
```

### 2. Configure Integrations
Settings → Integrations → Add credentials

### 3. Generate Code
- Enter prompt
- Click Generate
- Code appears in real-time
- Edit in code panel
- Push to repository

### 4. Track Usage
- View token count in header
- Check history for all generations
- Monitor billing logs

## Deployment

### Docker
```bash
docker build -t roseram-builder .
docker run -p 3001:3001 \
  -e SUPABASE_PROJECT_URL=... \
  -e X_API_KEY=... \
  roseram-builder
```

### Netlify/Vercel
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy on push

## Support
- Domain: https://roseram.com
- Documentation: https://roseram.com/docs
- Support Email: support@roseram.com

## Development

### Local Setup
```bash
npm install
npm run dev
# App runs at http://localhost:3001
```

### Testing
```bash
# Test code generation
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a hello world page"}'
```

## Security Considerations

- Never commit `.env.local` to version control
- Rotate tokens regularly
- Use service roles for backend operations
- Implement rate limiting in production
- Enable CORS restrictions
- Use HTTPS for all connections

---

**Version**: 1.0.0
**Last Updated**: 2025
