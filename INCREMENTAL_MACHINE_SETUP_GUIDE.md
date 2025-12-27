# Incremental Fly.io Machine Setup Guide

## Overview

The incremental machine setup system provides a **step-by-step, user-controlled approach** to provisioning and booting Fly.io machines for your repository previews. Instead of automatic background deployment that users can't see or control, this system:

✅ Shows each step of the process
✅ Lets users see what's happening in real-time  
✅ Provides full control - users can start each step when ready
✅ Gives detailed logs and feedback at each stage
✅ Makes it easy to debug if something goes wrong

## Architecture

### Database Schema

A new `machine_setup_sessions` table tracks the setup progress:

```sql
machine_setup_sessions:
  - id (UUID, primary key)
  - project_id (UUID, foreign key to projects)
  - user_id (UUID, foreign key to auth.users)
  - current_step (1-4)
  - completed_steps (array of completed step numbers)
  - overall_status ('in_progress', 'completed', 'failed', 'cancelled')
  
  - step_1_status, step_1_details (repository detection)
  - step_2_status, step_2_details (machine allocation)
  - step_3_status, step_3_details (settings configuration)
  - step_4_status, step_4_details (repository boot)
  
  - fly_app_name (unique app name like "roseram-a1b2c3d4")
  - preview_url (https://roseram-a1b2c3d4.fly.dev)
  - github_repo_url, github_branch
  - error_message, error_step (if failed)
```

### API Endpoints

#### GET `/api/machine-setup`

Creates a new setup session or retrieves an existing one.

**Query Parameters:**
- `projectId` (required) - UUID of the project
- `githubRepo` (required) - Full GitHub repo URL (e.g., `https://github.com/user/repo`)
- `githubBranch` (optional, default: `main`) - Branch to deploy

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "projectId": "uuid",
    "userId": "uuid",
    "flyAppName": "roseram-a1b2c3d4",
    "previewUrl": "https://roseram-a1b2c3d4.fly.dev",
    "currentStep": 1,
    "completedSteps": [],
    "overallStatus": "in_progress"
  },
  "isNew": true
}
```

#### POST `/api/machine-setup`

Executes a specific setup step.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "stepNumber": 1
}
```

**Response:**
```json
{
  "success": true,
  "session": { /* updated session */ },
  "stepResult": {
    "step": 1,
    "status": "completed",
    "details": {
      "repositoryName": "user/repo",
      "branchName": "main",
      "projectType": "next",
      "description": "Repository detected and validated successfully"
    }
  }
}
```

## The 4 Setup Steps

### Step 1: Repository Detection ✓

**What it does:**
- Verifies the GitHub repository exists and is accessible
- Validates the specified branch exists
- Detects the project type (Node.js, Next.js, React, etc.)
- Identifies build and start scripts from package.json

**User sees:**
- Repository name and URL
- Branch validation
- Detected project type
- Available scripts

**Success output:**
```json
{
  "repositoryName": "user/repo",
  "repositoryUrl": "https://github.com/user/repo",
  "branchName": "main",
  "projectType": "next",
  "packageInfo": {
    "scripts": ["dev", "build", "start"]
  }
}
```

### Step 2: Machine Allocation ✓

**What it does:**
- Reserves a unique Fly.io app name (deterministic, based on user + project)
- Allocates compute resources
- Configures machine region
- Sets up resource limits

**User sees:**
- App name: `roseram-a1b2c3d4`
- Machine size: `shared-cpu-2x`
- Region: `dfw` (Dallas)
- Preview URL ready

**Success output:**
```json
{
  "appName": "roseram-a1b2c3d4",
  "previewUrl": "https://roseram-a1b2c3d4.fly.dev",
  "machineSize": "shared-cpu-2x",
  "region": "dfw"
}
```

### Step 3: Settings Configuration ✓

**What it does:**
- Sets environment variables
- Configures memory and CPU allocation
- Enables auto-start/stop features
- Sets up shutdown policies

**User sees:**
- Environment configuration
- Resource allocation (CPU, Memory)
- Auto-stop timeout (1 hour)

**Success output:**
```json
{
  "environment": {
    "NODE_ENV": "production"
  },
  "resources": {
    "cpu": 2,
    "memory": 1024
  },
  "autoStartStop": true,
  "shutdownAfterInactivity": "1h"
}
```

### Step 4: Repository Boot ✓

**What it does:**
- Clones the repository to the machine
- Installs dependencies
- Builds the application if needed
- Starts the development server

**User sees:**
- Clone status
- Install progress
- Build output
- Server startup logs
- Preview becoming live

**Success output:**
```json
{
  "bootStatus": "ready",
  "syncStatus": "ready",
  "nextActions": [
    "Repository cloned from ...",
    "Dependencies installing...",
    "Dev server starting...",
    "Preview available at ..."
  ]
}
```

## Frontend Integration

### Using the Component

```jsx
import { IncrementalMachineSetup } from "@/components/IncrementalMachineSetup";

export function MyPreviewComponent() {
  const handleSetupComplete = (data) => {
    console.log("Setup complete!", {
      appName: data.appName,
      previewUrl: data.previewUrl,
    });
  };

  const handleSetupError = (error) => {
    console.error("Setup failed:", error.message);
  };

  return (
    <IncrementalMachineSetup
      projectId="project-uuid"
      githubRepo="https://github.com/user/repo"
      githubBranch="main"
      onSetupComplete={handleSetupComplete}
      onError={handleSetupError}
    />
  );
}
```

### Using the Service Functions

```javascript
import {
  initializeSetupSession,
  executeSetupStep,
  canExecuteStep,
  isSetupComplete,
} from "@/lib/machine-setup-service";

// Create session
const session = await initializeSetupSession(
  projectId,
  githubRepo,
  "main",
  accessToken
);

// Execute steps
if (canExecuteStep(1, session.completedSteps)) {
  const { session: updated, stepResult } = await executeSetupStep(
    session.id,
    1,
    accessToken
  );
  
  console.log(stepResult.details);
}

// Check if done
if (isSetupComplete(updated.completedSteps)) {
  console.log("All setup complete!");
}
```

## User Experience Flow

1. **User connects a GitHub repository** in the IDE
2. **Clicks "Preview" tab** to start setup
3. **Setup modal appears** showing the 4 steps
4. **User reads Step 1 details** (repository detection)
5. **User clicks "Execute Step 1"** button
   - Button shows loading spinner
   - API validates repository
   - Results show: repository name, branch, project type
   - Status changes to "✓ completed"
6. **User clicks "Continue to Next Step"** button
7. **Step 2 appears** (machine allocation)
8. **Repeat for steps 3 and 4**
9. **Setup completes** with preview URL ready
10. **User can click preview URL** to see their app live

## Real-Time Logs

Every action is logged in real-time:

```
[12:34:56] Setup session created successfully
[12:34:56] App Name: roseram-a1b2c3d4
[12:34:56] Preview URL: https://roseram-a1b2c3d4.fly.dev
[12:35:01] Executing Step 1: Repository Detection
[12:35:02] ✓ Step 1 completed successfully
[12:35:02] Repository detected and validated successfully
[12:35:07] Executing Step 2: Machine Allocation
[12:35:08] ✓ Step 2 completed successfully
...
```

## Error Handling

If a step fails:

1. **Error message displayed** in the alert area
2. **Step status shows "error"** with red icon
3. **Logs show the error** with timestamp and details
4. **User can retry** by clicking "Execute Step X" again
5. **Or diagnose** using the logs and error details

Example error:

```
[12:35:15] Executing Step 1: Repository Detection
[12:35:16] Error: Repository not found
[12:35:16] ✗ Error: Failed to detect and validate repository
```

## Database Queries

### Get User's Setup Sessions

```sql
SELECT * FROM machine_setup_sessions
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Get In-Progress Sessions

```sql
SELECT * FROM machine_setup_sessions
WHERE user_id = auth.uid()
AND overall_status = 'in_progress'
ORDER BY created_at DESC;
```

### Get Setup Progress

```sql
SELECT 
  id,
  fly_app_name,
  preview_url,
  current_step,
  completed_steps,
  overall_status,
  get_setup_session_progress(id) as progress
FROM machine_setup_sessions
WHERE project_id = $1
AND user_id = auth.uid()
LIMIT 1;
```

## Advantages Over Previous System

| Feature | Previous | New |
|---------|----------|-----|
| **Visibility** | Background process (hidden) | Real-time step-by-step |
| **Control** | Automatic (no user control) | User-controlled |
| **Feedback** | Stuck on "launching..." | Detailed logs at each step |
| **Debugging** | Hard to diagnose issues | Clear error messages per step |
| **Progress** | Unclear if working | Visual progress with checkmarks |
| **User Experience** | Frustrating (feels broken) | Transparent and controllable |

## Implementation Checklist

- [x] Database migration (machine_setup_sessions table)
- [x] API endpoints (GET and POST /api/machine-setup)
- [x] Step 1 implementation (Repository Detection)
- [x] Step 2 implementation (Machine Allocation)
- [x] Step 3 implementation (Settings Configuration)
- [x] Step 4 implementation (Repository Boot)
- [x] React component (IncrementalMachineSetup.jsx)
- [x] Service functions (machine-setup-service.js)
- [x] Real-time logs
- [x] Error handling
- [ ] Integration with existing preview components
- [ ] Actual Fly.io machine provisioning (Step 2-4)
- [ ] Testing with real repositories

## Next Steps

1. **Deploy the database migration** to add machine_setup_sessions table
2. **Replace the existing preview component** with IncrementalMachineSetup
3. **Implement actual Fly.io provisioning** in steps 2-4 (currently ready for implementation)
4. **Test with various repository types** (Next.js, React, Node.js, etc.)
5. **Add progress persistence** (resume setup if interrupted)
6. **Add cleanup routines** (auto-delete stale sessions)
7. **Monitor and optimize** based on user feedback

## Customization

You can customize:

- **Step 2 machine specs:** Edit `executeStep2()` in `/api/machine-setup/route.js`
- **Step 3 environment variables:** Edit `executeStep3()` for your environment
- **Region selection:** Change `region: 'dfw'` to your preferred Fly.io region
- **Step titles and descriptions:** Edit the STEPS array in `IncrementalMachineSetup.jsx`
- **Timeouts and retry logic:** Add to the service functions

## Troubleshooting

### Setup session not creating
- Check Supabase connection
- Verify migration ran: `SELECT * FROM machine_setup_sessions LIMIT 1`
- Check API logs for errors

### Steps not progressing
- Verify GitHub token is configured
- Check API logs for authentication errors
- Ensure user has permissions to repository

### Preview URL not loading
- Confirm Fly.io token is valid
- Check that machine provisioning completed
- Verify application starts without errors

## Support

For detailed API documentation, see:
- `app/api/machine-setup/route.js` - API endpoint implementation
- `supabase/migrations/add_incremental_machine_setup.sql` - Database schema
- `lib/machine-setup-service.js` - Client-side service functions
