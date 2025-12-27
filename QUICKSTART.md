# Roseram Builder - Quick Start Guide

Get up and running with Roseram Builder in 5 minutes.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org))
- npm or yarn
- Code editor (VS Code recommended)

## Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd roseram-builder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your actual credentials:

```bash
# Supabase (get from supabase.com)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE=your_service_key

# X API (get from x.ai or console.x.ai)
X_API_KEY=your_x_api_key

# Optional: For GitHub/Netlify integration
GITHUB_ACCESS_TOKEN=your_github_token
VITE_NETLIFY_ACCESS_TOKEN=your_netlify_token
```

### 4. Create Admin User

Option A - Using the setup endpoint:

```bash
# Start the dev server first (see below)
# Then in another terminal:
curl -X POST http://localhost:3001/api/setup
```

Option B - Using Supabase dashboard:

1. Go to [Supabase](https://supabase.com)
2. Sign in and select your project
3. Go to **Authentication → Users**
4. Click **Create a new user**
5. Email: `admin@roseram.com`
6. Password: `PAssword123!!!`
7. Check "Auto confirm user"
8. Click **Create user**

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3001**

## First Time Usage

1. **Open browser**: http://localhost:3001
2. **Login** with:
   - Email: `admin@roseram.com`
   - Password: `PAssword123!!!`
3. **Try a prompt**: 
   - Example: "Create a beautiful landing page with a hero section"
4. **Preview**: Click the Preview tab to see the generated code
5. **Deploy**: Add your GitHub/Netlify tokens and deploy!

## Common Tasks

### Generate Code

```
1. Go to Dashboard
2. Enter a prompt in the text area
3. Click "Generate Code"
4. View the generated HTML/CSS/JavaScript
5. Edit if needed
```

### Push to GitHub

```
1. Create a repository on GitHub
2. Get your Personal Access Token (Settings → Developer settings → Personal access tokens)
3. Copy the repo URL (https://github.com/user/repo)
4. Paste in the GitHub section
5. Add your PAT (Personal Access Token)
6. Click "Push to GitHub"
```

### Deploy to Netlify

```
1. Create a site on Netlify
2. Get your Site ID and Access Token
3. Paste Site ID in the Netlify section
4. Add your Access Token
5. Click "Deploy to Netlify"
6. Wait for deployment
7. Click the URL to view your live app
```

## Project Structure Overview

```
app/              # Next.js app directory
├── api/          # API routes (backend)
├── dashboard/    # Protected pages
└── page.tsx      # Login page

components/       # React components
lib/              # Utilities (auth, database, types)
public/           # Static files
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

Edit files in your editor. The dev server will hot-reload.

### 3. Test Locally

- Login and test functionality
- Check browser console for errors
- Use Network tab to debug API calls

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

### 5. Deploy

Push to main branch:

```bash
git push origin main
```

Netlify will automatically build and deploy.

## Useful Commands

```bash
# Development
npm run dev           # Start dev server

# Production
npm run build        # Build for production
npm start            # Start prod server
npm run lint         # Check code style

# Setup
npm run setup-auth   # Initialize admin user
```

## Debugging

### Browser Console

Open DevTools (F12) → Console tab to see:
- JavaScript errors
- Network requests
- Warning messages

### Network Tab

Monitor API calls:
1. Open DevTools → Network tab
2. Trigger action (login, generate code, deploy)
3. View request/response

### Server Logs

The dev server logs appear in your terminal:

```bash
> roseram-builder@0.1.0 dev
> next dev -p 3001

  ▲ Next.js 15.5.6
  - Local:        http://localhost:3001

✓ Ready in 1.5s
```

### Environment Variables

Verify variables are set:

```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $X_API_KEY
```

## Troubleshooting

### "Cannot find module" Error

Solution: Reinstall dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3001 Already in Use

Solution: Change the port

```bash
npm run dev -- -p 3002
```

Or kill the process using the port:

```bash
# macOS/Linux
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Login Not Working

1. Check Supabase URL and keys in `.env.local`
2. Verify admin user exists in Supabase
3. Check browser Network tab for errors
4. Review server logs for details

### Code Generation Failing

1. Verify `X_API_KEY` is set correctly
2. Check API key hasn't been revoked
3. Monitor usage limits
4. Review error message in browser

### GitHub Push Failed

1. Verify Personal Access Token is valid
2. Confirm repo URL format: `https://github.com/owner/repo`
3. Ensure token has `repo` scope
4. Check repository is accessible

### Netlify Deploy Failed

1. Verify Site ID and Access Token
2. Confirm Netlify site exists
3. Check token permissions
4. Review Netlify dashboard for details

## Learning Resources

- **[Next.js Docs](https://nextjs.org/docs)** - Framework documentation
- **[React Docs](https://react.dev)** - React fundamentals
- **[Supabase Docs](https://supabase.com/docs)** - Database & Auth
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Styling
- **[TypeScript Docs](https://www.typescriptlang.org/docs)** - Type safety

## Getting Help

1. Check the [README.md](README.md) for overview
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
3. Check [DEPLOYMENT.md](DEPLOYMENT.md) for production info
4. Search Google for specific error messages
5. Ask in community forums or project issues

## Next Steps

1. ✅ Get the app running locally
2. ✅ Generate some sample code
3. ✅ Try pushing to GitHub
4. ✅ Deploy to Netlify
5. 🔄 Customize the UI
6. 🔄 Add more features
7. 🔄 Deploy to production

## Tips & Tricks

### Use Smart Prompts

Instead of: "Make a button"

Try: "Create a modern gradient button with hover effects and rounded corners, using Tailwind CSS classes"

### Save Generated Code

Copy from the HTML/CSS/JS tabs and save to your projects

### Test Locally Before Deploy

Always preview the code in the Preview tab before deploying

### Use Browser DevTools

- **Console**: Check for errors
- **Network**: Monitor API calls  
- **Sources**: Debug JavaScript
- **Application**: Check storage

### Version Control

Always commit working code:

```bash
git add .
git commit -m "Working version of feature"
git push origin branch-name
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port already in use | Change port: `npm run dev -- -p 3002` |
| Modules not found | Reinstall: `npm install` |
| Login fails | Check Supabase credentials in .env.local |
| Code gen fails | Verify X_API_KEY and API usage limits |
| Deploy fails | Check GitHub/Netlify tokens and permissions |

## Support

- 📖 Read the documentation files
- 🐛 Check browser console for errors
- 🔍 Use Network tab to debug API calls
- 📝 Review terminal output for server logs
- 💬 Ask questions in project discussions

Happy coding! 🚀
