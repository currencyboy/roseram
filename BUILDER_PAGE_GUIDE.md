# Builder Page Guide - Grok-Powered Development Environment

## Overview

The `/builder` page is a Builder.io-like development environment that uses Grok AI for prompt engineering. It allows you to:

- Connect and manage multiple GitHub repositories
- Preview code changes in real-time
- Use Grok AI to generate and modify code
- Store secure credentials for integrations
- Track file changes with revision history

## Getting Started

### 1. Access the Builder Page
Navigate to `/builder` in your application.

### 2. Connect Integrations
Click the **Settings** button (⚙️) or **Connect GitHub** to open the integration modal.

#### GitHub Integration
- **Step 1**: Provide a GitHub personal access token
  - Go to https://github.com/settings/tokens
  - Create a new token with `repo` scope
  - Copy the token and paste it in the integration modal

- **Step 2**: Add repositories to your workspace
  - Click "Add Repository" in the GitHub tab
  - Enter the repository owner and name
  - Optionally specify a default branch (defaults to `main`)
  - Click "Add Repository" to save

- **Step 3**: Select a repository
  - Click on any repository from the list to make it your active workspace
  - The repository structure will load automatically

#### Supabase Integration (Optional)
- Provide your Supabase project URL and API key
- Find these in your Supabase project settings
- This is optional but recommended for database operations

### 3. Using the Code Editor

#### File Explorer
- Left sidebar shows all files in your repository
- Click a file to open it in the editor
- Folders can be expanded/collapsed with arrow icons
- Modified files show a yellow indicator (●)

#### Code Editor
- Center panel shows the currently selected file
- Edit code directly in the textarea
- Click **Save** to save changes and trigger preview refresh

#### Live Preview
- Right panel shows a live preview of your code
- Automatically refreshes when:
  - You save a file (for code files: .html, .css, .js, etc.)
  - AI generates code changes
  - You manually refresh with the refresh button

- Navigation controls:
  - Back/Forward buttons for history navigation
  - URL input to navigate to specific paths
  - Refresh button to force reload
  - Open in New Tab to view in full browser window

### 4. Using Grok AI for Code Generation

#### Sending Prompts
1. Look at the **AI Assistant** panel (left side)
2. Type your request in the input box at the bottom
3. Press `Ctrl+Enter` or click the Send button
4. Grok will analyze your codebase and generate changes

#### Examples of Prompts
- "Create a new component called Button with props for size and color"
- "Add error handling to the API endpoints"
- "Create a responsive landing page layout"
- "Add dark mode support to the theme"
- "Refactor the login form to use React hooks"

#### Reviewing Changes
1. After Grok generates code, a **File Diff Preview** modal appears
2. Review all changes before applying
3. Shows side-by-side comparison of original vs. modified code
4. Click "Apply Changes" to accept and apply all modifications
5. Click "Cancel" to discard without applying

#### Real-Time Preview Updates
- When you apply AI-generated changes, the preview automatically refreshes
- Multiple refresh cycles ensure the iframe properly updates
- You can immediately see the impact of code generation

### 5. Repository Management

#### Add Multiple Repositories
- Click "Add Repository" in the GitHub integration tab
- Each repository is stored securely in your user profile
- Switch between repositories at any time

#### Switch Active Repository
- Click on a repository in the list to make it active
- The file explorer automatically loads the new repository structure
- All changes are saved before switching

#### Remove a Repository
- Click the trash icon (🗑️) next to a repository
- The repository is removed from your workspace (doesn't delete from GitHub)

#### Secure Credential Storage
- GitHub tokens are encrypted before storage
- Tokens are stored in the `user_integrations` table
- Only associated with your user account
- Secure RLS (Row Level Security) policies prevent unauthorized access

### 6. Revision History & Undo

- Every change is tracked with the revision system
- Changes are saved with metadata:
  - File path
  - Change type (edit, generate, etc.)
  - Timestamp
  - Description

- You can restore previous versions of files
- Access revision history from the UI controls

### 7. Integration Status

The integration status bar at the top shows:

- **GitHub**: Connected repository and status
- **Supabase**: Database connection status
- **Grok AI**: AI availability status
- **Session**: Current user authentication

Click any status card to access settings.

## Architecture & Features

### Real-Time Preview System
- Iframe-based preview with auto-refresh
- Multiple refresh cycles for robust updates
- Supports both inline code (srcDoc) and dev server previews
- Navigation history with back/forward buttons

### Code Generation
- Grok analyzes your entire codebase as context
- Understands project structure and tech stack
- Generates multi-file changes
- Creates organized code with proper formatting

### Secure Integration Mapping
- API endpoint: `/api/integrations/repositories`
- Manages GitHub token encryption
- Stores repository metadata
- RLS-protected database operations

### File Change Tracking
- Pending changes preview before applying
- Visual diff display
- Undo/revision support
- Action logging for audit trails

## Workflow Example: Building a Feature

1. **Connect Repository**
   - Add your GitHub repository
   - Select it as the active workspace

2. **Analyze Structure**
   - Browse files in the explorer
   - Review project layout

3. **Generate Code**
   - Describe what you want to build
   - Review the diff preview
   - Apply changes

4. **Preview Changes**
   - Live preview shows updated code
   - Test the new feature

5. **Save & Continue**
   - Changes are auto-saved to revision history
   - Continue iterating with new prompts

## Troubleshooting

### Preview Not Updating
- Click the refresh button in the preview toolbar
- Check that file was saved successfully
- Ensure dev server is running at correct URL

### Repository Not Loading
- Verify GitHub token has `repo` scope
- Check that repository is public or token has access
- Try removing and re-adding the repository

### Grok Not Responding
- Ensure `NEXT_PUBLIC_X_API_KEY` is configured
- Check that Grok API is accessible
- Review API usage limits

### Credentials Not Saving
- Ensure you're authenticated with Supabase
- Check that `user_integrations` table exists
- Verify RLS policies allow your user to write

## API Endpoints

### Get Repositories
```
GET /api/integrations/repositories?action=list
Authorization: Bearer {token}
```

### Add Repository
```
POST /api/integrations/repositories
Authorization: Bearer {token}
Body: {
  action: 'add',
  owner: string,
  repoName: string,
  defaultBranch?: string,
  githubToken: string
}
```

### Remove Repository
```
POST /api/integrations/repositories
Authorization: Bearer {token}
Body: {
  action: 'remove',
  repositoryId: string
}
```

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_PROJECT_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE`: Supabase service role key (server-side)
- `NEXT_PUBLIC_X_API_KEY`: Grok API key
- `NEXT_PUBLIC_GITHUB_ACCESS_TOKEN`: GitHub token (optional, can be provided via UI)

## Security Considerations

1. **Credential Encryption**: GitHub tokens are base64 encoded before storage (in production, use proper encryption)
2. **RLS Policies**: Database access is restricted to authenticated users
3. **Token Scoping**: GitHub tokens use minimal required scopes
4. **No Secret Logs**: Credentials are never logged or exposed
5. **User Isolation**: Each user can only access their own integrations

## Performance Tips

1. **Preview Performance**
   - Keep preview URLs simple
   - Avoid large media files in preview
   - Use relative paths for assets

2. **Code Generation**
   - Provide clear, specific prompts
   - Include context about your project
   - Review changes before applying

3. **Repository Management**
   - Keep repositories focused and organized
   - Use meaningful branch names
   - Archive completed projects

## Future Enhancements

Planned features for future versions:

- [ ] Real-time collaboration with multiple users
- [ ] Deploy directly to Netlify from builder
- [ ] Git integration for commits and pushes
- [ ] Component library preview
- [ ] Custom CSS/styling tools
- [ ] Database schema visualization
- [ ] API endpoint testing tool
- [ ] Performance monitoring
- [ ] Team workspaces

## Support

For issues or feature requests, please contact support or submit a GitHub issue.
