# Roseram Builder - Getting Started Guide

Welcome to Roseram Builder! This guide will walk you through everything you need to know to use the application.

## What is Roseram Builder?

Roseram Builder is an **AI-powered code generation platform** that helps you:

- ✨ Generate production-ready HTML/CSS/JavaScript code from natural language prompts
- 🤖 Use Grok AI (X.AI) for intelligent code generation and error debugging
- 🚀 Deploy directly to GitHub repositories
- 🌐 Deploy directly to Netlify hosting
- 💾 Save and manage multiple projects
- 🐛 Debug runtime errors with AI assistance
- 📊 Track usage and analytics

## Quick Start (5 minutes)

### 1. Login

Visit the login page and enter your credentials:

```
Email: admin@roseram.com
Password: PAssword123!!!
```

(Or use your custom credentials if configured differently)

### 2. Start Generating Code

1. Click **"Code Generator"** tab
2. Enter a prompt:
   ```
   Create a beautiful landing page with a hero section, 
   feature list, and CTA button
   ```
3. Click **"Generate Code"** or press `Ctrl+Enter`
4. Wait for AI to generate HTML/CSS/JavaScript
5. Preview the code in the iframe

### 3. Edit & Customize

- **HTML Editor**: Modify HTML structure
- **CSS Editor**: Update styles
- **JS Editor**: Add interactivity
- **Live Preview**: See changes in real-time

### 4. Deploy

Choose your deployment method:
- **GitHub**: Push code to your repository
- **Netlify**: Deploy live website

## Core Features

### 1. Code Generation with Grok AI

The AI understands natural language and generates clean code:

**Example prompts:**
```
- A responsive navbar with logo and menu
- Dark mode toggle with smooth transitions
- E-commerce product card with add to cart button
- Login form with email validation
- Dashboard with line charts and statistics
```

**Pro tip**: Use the "✨ Enhance" button to improve your prompt with technical details!

### 2. Prompt Enhancement

Vague prompts? Let AI enhance them:

1. Enter your prompt: "A nice form"
2. Click "✨ Enhance" button
3. AI returns improved version: "A modern, accessible form with email, password, and 'Remember me' checkbox, with client-side validation and smooth focus states"
4. Review and adjust if needed

### 3. Code Editing

Edit generated code before deploying:

- **Live preview** on the right
- **Syntax highlighting** for HTML/CSS/JS
- **Auto-save** to your browser
- **Undo/Redo** support (via browser)

### 4. Project Management

Organize your work:

1. Go to **"Projects"** tab
2. Click **"New Project"** to create
3. Add name and description
4. Save generated code to project
5. View project history and deployments

### 5. Error Debugging

Got a runtime error? Let AI fix it:

1. Enter error message: "TypeError: Cannot read property 'x' of undefined"
2. Provide context (optional)
3. Click **"Analyze Error"**
4. AI provides:
   - Explanation of what went wrong
   - Step-by-step fixes
   - Prevention tips

### 6. Integration Management

Connect GitHub and Netlify:

1. Go to **"Integrations"** tab
2. Click "Connect GitHub" or "Connect Netlify"
3. Paste your access token
4. AI verifies the connection
5. You're ready to deploy!

**How to get tokens:**

**GitHub:**
1. GitHub > Settings > Developer settings > Personal access tokens
2. Generate new token with "repo" scope
3. Copy and paste in Roseram

**Netlify:**
1. Netlify > Account settings > Applications > Personal access tokens
2. Generate new token
3. Copy and paste in Roseram

### 7. Analytics Dashboard

Track your usage:

- 📊 Total projects created
- 🚀 Code generations run
- 🌐 Deployments made
- 💾 API tokens used
- ⏰ Last activity

## Advanced Features

### Multi-turn Conversations

Continue conversations with AI:

1. Generate initial code
2. Ask follow-up: "Add dark mode support"
3. AI maintains context and updates code
4. Perfect for iterative development

### Code Templates

(Coming soon) Pre-built templates for:
- Landing pages
- Dashboards
- E-commerce
- Blogs
- Forms

### Real-time Collaboration

(Coming soon) Work with teammates:
- Live editing
- Presence awareness
- Comments & feedback
- Version history

## Best Practices

### 1. Writing Better Prompts

❌ Bad:
```
Make a website
```

✅ Good:
```
Create a modern SaaS landing page with:
- Hero section with headline and CTA
- Three feature cards
- Testimonials section
- Responsive design (mobile-first)
- Dark mode support
```

### 2. Testing Generated Code

Always test before deploying:
1. Review the generated code
2. Test in the live preview
3. Check for errors in browser console
4. Use Error Debugger if issues found
5. Make edits as needed

### 3. Security

**Never expose:**
- API keys
- Database passwords
- Private tokens
- User data

**Use environment variables** for sensitive data:
```html
<!-- ❌ Bad -->
<script>
  const API_KEY = "sk_live_...";
</script>

<!-- ✅ Good -->
<!-- Server-side only -->
```

### 4. Optimization

Generated code is production-ready, but you can:
- Minify CSS/JS
- Optimize images
- Use a CDN
- Enable caching
- Add compression

## Troubleshooting

### "Generation Failed"

**Cause**: API rate limit or network error

**Fix**:
1. Wait a moment
2. Check your internet connection
3. Verify X_API_KEY is configured
4. Try again

### "GitHub Integration Failed"

**Cause**: Invalid token or insufficient permissions

**Fix**:
1. Verify token is still valid
2. Check token has "repo" scope
3. Try regenerating token
4. Disconnect and reconnect

### "Code Preview Blank"

**Cause**: JavaScript errors or blocked content

**Fix**:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Use Error Debugger
4. Fix errors and reload

### "Can't Login"

**Cause**: Wrong credentials or Supabase down

**Fix**:
1. Verify email is correct
2. Check caps lock on password
3. Try "Forgot Password"
4. Check Supabase status: [status.supabase.com](https://status.supabase.com)

## API Documentation

### Generate Code

```bash
POST /api/generate
Content-Type: application/json

{
  "prompt": "Create a button with hover effects",
  "context": []  // optional: previous messages
}

# Response
{
  "success": true,
  "code": {
    "html": "...",
    "css": "...",
    "javascript": "...",
    "framework": "vanilla",
    "dependencies": []
  }
}
```

### Debug Error

```bash
POST /api/debug
Content-Type: application/json

{
  "error": "TypeError: Cannot read property 'x' of undefined",
  "code": {
    "html": "...",
    "css": "...",
    "javascript": "..."
  },
  "context": "User clicked submit button"
}

# Response
{
  "success": true,
  "suggestion": "The variable 'obj' might be undefined",
  "fixes": ["Check if obj exists before accessing x", "..."],
  "explanation": "..."
}
```

### Enhance Prompt

```bash
POST /api/enhance-prompt
Content-Type: application/json

{
  "prompt": "Make a form"
}

# Response
{
  "success": true,
  "enhanced_prompt": "Create a modern, accessible form..."
}
```

### Deploy to GitHub

```bash
POST /api/github/push
Content-Type: application/json

{
  "repoUrl": "https://github.com/user/repo",
  "token": "github_token",
  "fileName": "index.html",
  "fileContent": "...",
  "message": "Generated with Roseram Builder"
}

# Response
{
  "success": true,
  "commit": "abc123...",
  "htmlUrl": "https://github.com/user/repo/commit/abc123"
}
```

### Deploy to Netlify

```bash
POST /api/netlify/deploy
Content-Type: application/json

{
  "siteId": "your-site-id",
  "token": "netlify_token",
  "html": "...",
  "css": "...",
  "javascript": "..."
}

# Response
{
  "success": true,
  "url": "https://your-site.netlify.app",
  "deployId": "..."
}
```

## Settings & Preferences

Go to **"Settings"** to:
- View your email and account info
- Manage API keys
- View current session
- Log out

## Performance Tips

1. **Keep prompts under 500 characters** for faster generation
2. **Use specific colors/fonts** instead of vague descriptions
3. **Reference popular designs** ("like Airbnb", "like Stripe")
4. **Break complex designs** into multiple generation steps
5. **Cache results** before editing heavily

## Limits & Quotas

**Free Tier:**
- 10 projects
- 50 code generations/month
- 5 deployments/month

**Pro Tier (coming soon):**
- Unlimited projects
- Unlimited generations
- Advanced AI features
- Priority support

## Getting Help

- **Documentation**: Read all the markdown files in this project
- **Error Messages**: Click on errors to get detailed explanations
- **Browser Console**: Press F12 to check for JavaScript errors
- **Network Tab**: Check failed API requests

## Next Steps

1. ✅ Login to your account
2. ✅ Connect GitHub and Netlify integrations
3. ✅ Generate your first piece of code
4. ✅ Deploy to GitHub or Netlify
5. ✅ Share with the world!

## Example: Build a Landing Page

Let's create a complete landing page:

### Step 1: Generate

Prompt:
```
Create a modern SaaS landing page with:
- Blue and white color scheme
- Hero section with headline and two CTAs
- Three benefit cards with icons
- Testimonials carousel
- Footer with links
- Fully responsive design
```

### Step 2: Review

Check the generated code looks good in preview.

### Step 3: Customize (optional)

Edit CSS to match your brand colors:
```css
:root {
  --primary: #3b82f6;  /* Your brand color */
  --text: #1f2937;
  --light: #f9fafb;
}
```

### Step 4: Deploy

Connect GitHub > Push code > Share your repository!

Or connect Netlify > Deploy > Get live URL instantly!

## Keyboard Shortcuts

- `Ctrl+Enter` - Generate code (from prompt input)
- `Ctrl+S` - Save project (when on project)
- `F12` - Open browser DevTools
- `Tab` - Next editor

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/)
- [CSS-Tricks](https://css-tricks.com/)

## Feedback & Feature Requests

Have ideas? Found a bug?

Create an issue on GitHub:
```
https://github.com/roseram/roseram-builder/issues
```

---

**Happy building! 🚀**

For detailed technical documentation, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [SUPABASE_SCHEMA.md](./SUPABASE_SCHEMA.md) - Database structure
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
