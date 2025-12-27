# User Session Management System

## Overview

The application has been updated to use a service-based user identification system instead of email/password authentication. Users are identified by the services they connect (GitHub, Supabase, Netlify) and their sessions are automatically cached and restored.

## Key Features

### 1. **Auto-Generated User IDs**
- User IDs are automatically generated when the user connects their first service
- Format: `{service}_{serviceId}_{timestamp}`
- Example: `github_john_doe_abc123_1234567890`

### 2. **Smart Credential Validation**
- Credentials are validated immediately when pasted/uploaded
- If a credential expires, users are prompted to re-enter it
- Three validation endpoints check GitHub, Supabase, and Netlify tokens

### 3. **Returning User Detection**
- When users return, their cached credentials are automatically checked
- If credentials are still valid, they're auto-filled
- If expired, users are prompted to re-authenticate
- Duplicate accounts are automatically merged if the same service ID is detected

### 4. **Multi-Backend Storage**
- **Primary**: Browser localStorage (no server required)
- **Optional**: Supabase database (if user connects Supabase)
- Data syncs automatically when Supabase is available

### 5. **Cached Data**
The system caches the following for returning users:
- Environment variables (GitHub token, Supabase credentials, Netlify token, X API key)
- Integration settings (selected repositories, databases, sites)
- Form inputs and preferences
- Project configurations

## User Flow

### First-Time Users
1. Land on home page
2. See "Get Started" panel with environment variable upload/paste options
3. Upload `.env` file or paste environment variables
4. System validates credentials and creates user session
5. User continues to full setup page at `/setup`
6. Configures integrations and proceeds to builder

### Returning Users
1. Land on home page
2. System detects returning user from localStorage
3. Shows "Welcome back!" message with user context
4. Pasted/uploaded credentials are automatically validated
5. If valid, proceeds to setup; if expired, prompts for re-entry
6. Cached settings are restored automatically

## Data Storage

### localStorage Keys
```javascript
{
  "roseram_user_id": "github_john_abc123_timestamp",
  "roseram_user_data": { /* User metadata */ },
  "roseram_credentials": "Base64EncodedCredentials",
  "roseram_integrations": { /* Integration settings */ },
  "roseram_form_inputs": { /* Previous form inputs */ },
  "roseram_projects": [ /* Project configurations */ ],
  "roseram_service_metadata": { /* Service IDs and metadata */ },
  "roseram_last_synced": "ISO8601Timestamp"
}
```

### Supabase Schema
If Supabase is connected, a `user_sessions` table is created with:
- `user_id` (TEXT, unique)
- `user_data` (JSONB)
- `service_metadata` (JSONB)
- `credentials` (TEXT, base64 encoded)
- `form_inputs` (JSONB)
- `project_configs` (JSONB)
- `integration_settings` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

## API Endpoints

### POST `/api/validate-credentials`
Validates environment variable credentials in real-time
```json
Request: {
  "github_token": "ghp_xxx",
  "supabase_url": "https://xxx.supabase.co",
  "supabase_anon_key": "eyJhbGc...",
  "netlify_token": "xxx",
  "x_api_key": "xai_xxx"
}

Response: {
  "allValid": boolean,
  "validServices": [{ service, username/id }],
  "expiredServices": ["github", "supabase"],
  "errors": { "github": "error message" }
}
```

### POST `/api/user-session/sync`
Syncs user session to Supabase
```json
Request: {
  "userId": "github_john_abc123_timestamp",
  "userData": { /* ... */ },
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseKey": "eyJhbGc..."
}

Response: {
  "success": true,
  "synced": true,
  "message": "Session synced to Supabase"
}
```

### POST `/api/user-session/retrieve`
Retrieves user session from Supabase
```json
Request: {
  "userId": "github_john_abc123_timestamp",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseKey": "eyJhbGc..."
}

Response: {
  "success": true,
  "session": {
    "userId": "github_john_abc123_timestamp",
    "userData": { /* ... */ },
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### POST `/api/user-session/detect-duplicates`
Detects duplicate accounts with same service IDs
```json
Request: {
  "serviceMetadata": {
    "github": { "id": "12345", "username": "john" }
  },
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseKey": "eyJhbGc..."
}

Response: {
  "success": true,
  "hasDuplicates": false,
  "duplicates": []
}
```

## Components

### UserSessionProvider
Located at `components/UserSessionProvider.jsx`

Provides context for user session management:
```javascript
const {
  session,                    // Current user session
  userId,                     // Current user ID
  isAuthenticated,           // Boolean
  initializeUserSession,     // Create new user session
  storeCredentials,          // Store and validate credentials
  cacheIntegrations,         // Cache integration settings
  getCachedData,             // Get cached data
  mergeAccounts,             // Merge duplicate accounts
  clearSession               // Clear all session data
} = useUserSession();
```

### IntegrationSetupPanel
Located at `components/IntegrationSetupPanel.jsx`

Displayed on the home page, provides quick setup with:
- Environment variable import (paste or upload)
- Real-time credential validation
- Returning user detection
- Link to full setup page

### ReturningUserDetection
Located at `components/ReturningUserDetection.jsx`

Modal dialog that appears for returning users:
- Shows welcome message with last service used
- Lists expired services needing re-authentication
- Option to revalidate or use different account

### EnvVariableImporter (Updated)
Located at `components/EnvVariableImporter.jsx`

Now supports both:
- Pasting environment variables (.env format)
- Uploading `.env` files directly

## Usage Examples

### Initialize User Session
```javascript
const { initializeUserSession } = useUserSession();

const result = await initializeUserSession('github', {
  username: 'john_doe',
  id: '12345'
});
// result: { success: true, userId: 'github_john_12345_timestamp', isNewUser: true }
```

### Store Credentials
```javascript
const { storeCredentials } = useUserSession();

const result = await storeCredentials({
  github_token: 'ghp_xxx',
  supabase_url: 'https://xxx.supabase.co',
  supabase_anon_key: 'eyJhbGc...'
});
// Validates credentials and stores in localStorage
```

### Get Current Session
```javascript
import { getCurrentSession } from '@/lib/user-session';

const session = getCurrentSession();
// {
//   userId: 'github_john_abc123_timestamp',
//   userData: { /* ... */ },
//   serviceMetadata: { github: { /* ... */ } }
// }
```

## Security Considerations

1. **Credentials Encoding**: Credentials are base64 encoded in localStorage (not encrypted)
   - For production, consider using stronger encryption
   - Never expose credentials in logs or error messages

2. **Service Worker**: Credentials are only stored client-side initially
   - When synced to Supabase, they're still base64 encoded
   - Consider implementing server-side decryption with HSM

3. **Token Validation**: Tokens are validated with actual service APIs
   - Prevents storing invalid tokens
   - Detects expired tokens on return

4. **RLS Policies**: Supabase RLS policies allow public access to user_sessions
   - Consider implementing user-specific RLS after auth system is in place
   - Or use API endpoint with proper authorization

## Migration from LoginForm

The old email/password LoginForm has been removed. If you need to restore it:

1. The LoginForm component still exists at `components/LoginForm.jsx`
2. Update `app/page.jsx` to import and use LoginForm again
3. Restore the LoginForm JSX in the page

However, the new system is recommended as it provides:
- Better user experience (no passwords to remember)
- Automatic returning user detection
- Service-based authentication
- Credential caching across sessions

## Future Enhancements

1. **Encryption**: Implement proper encryption for stored credentials
2. **SSO Integration**: Add single sign-on with service providers
3. **WebAuthn**: Support biometric authentication
4. **Device Tracking**: Track and manage trusted devices
5. **Activity Log**: Maintain audit log of session activities
6. **Session Expiry**: Implement configurable session expiration
7. **Multi-Account**: Allow users to manage multiple accounts
8. **Offline Support**: Service worker for offline access

## Troubleshooting

### "User ID not found"
- Clear localStorage and reload the page
- Paste environment variables again to create new session

### "Credentials validation failed"
- Check if token is valid in the service's website
- Check if token has expired
- Ensure token has necessary permissions

### "Returning user prompt doesn't appear"
- Check browser's localStorage is enabled
- Clear browser cache and cookies
- Try using Incognito/Private mode

### "Session not syncing to Supabase"
- Verify Supabase credentials are valid
- Check if `user_sessions` table exists
- Check browser console for API errors
- Verify network requests in DevTools

## Support

For issues or questions:
1. Check browser console for error messages
2. Review the troubleshooting section above
3. Check the provided API documentation
4. Review component source code for implementation details
