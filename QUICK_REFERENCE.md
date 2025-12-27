# Roseram Builder - Quick Reference

## 🚀 Quick Start

```bash
# Setup
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Initialize
npm run setup-auth

# Run
npm run dev
# Open http://localhost:3001
```

## 📝 Login Credentials

```
Email: admin@roseram.com
Password: PAssword123!!!
(Or your custom credentials if configured)
```

## 🎯 Common Tasks

### Generate Code
1. Click "Code Generator" tab
2. Enter prompt: "Create a landing page with..."
3. Press Ctrl+Enter or click Generate
4. Review code in preview
5. Edit as needed

### Deploy to GitHub
1. Go to "Integrations" tab
2. Connect GitHub (Personal Access Token)
3. Go to "Deploy" section
4. Enter repo URL: `https://github.com/user/repo`
5. Click "Push to GitHub"

### Deploy to Netlify
1. Go to "Integrations" tab
2. Connect Netlify (Access Token)
3. Go to "Deploy" section
4. Click "Deploy to Netlify"
5. Get live URL instantly

### Debug Errors
1. Copy error message from console
2. Open "Error Debugger"
3. Paste error and context
4. Click "Analyze Error"
5. Apply suggested fixes

### Enhance Prompt
1. Write basic prompt
2. Click "✨ Enhance" button
3. AI improves with technical details
4. Review and use enhanced prompt

## 🔗 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/generate` | Generate code |
| POST | `/api/enhance-prompt` | Enhance prompt |
| POST | `/api/debug` | Debug errors |
| GET/POST | `/api/projects` | Manage projects |
| POST | `/api/integrations/manage` | Connect services |
| GET | `/api/github/repos` | List repositories |
| POST | `/api/github/push` | Push to GitHub |
| POST | `/api/netlify/deploy` | Deploy to Netlify |
| GET | `/api/analytics/metrics` | Get usage stats |

## 📊 Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE` | Yes | `eyJhbGc...` |
| `X_API_KEY` | Yes | `xai-...` |
| `ADMIN_EMAIL` | No | `admin@example.com` |
| `ADMIN_PASSWORD` | No | `SecurePassword123` |
| `GITHUB_ACCESS_TOKEN` | No | `ghp_...` |
| `VITE_NETLIFY_ACCESS_TOKEN` | No | `nfp_...` |

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Supabase configuration" | Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY |
| GitHub integration fails | Verify token has "repo" scope |
| Code generation fails | Check X_API_KEY is valid, verify internet connection |
| Preview blank | Open DevTools (F12), check Console for errors |
| Can't login | Verify email and password, check Supabase connection |

## 💡 Pro Tips

1. **Better Prompts**: Be specific about colors, layout, features
2. **Use Enhance**: Let AI improve vague prompts automatically
3. **Save Projects**: Keep generated code organized
4. **Test First**: Always preview code before deploying
5. **Use Error Debugger**: Get AI help fixing runtime errors
6. **Check Console**: Press F12 to debug JavaScript issues

## 🎨 Prompt Examples

### Good Prompts
```
Create a modern pricing page with:
- Hero section
- Three pricing cards
- Feature comparison table
- FAQ section
- Mobile responsive
- Dark mode support
```

### Great Prompts
```
Landing page like Stripe with:
- Animated hero section
- Feature cards with icons
- Testimonials carousel
- CTA buttons
- Footer with links
- Fully responsive
- Smooth scroll animations
```

## 📱 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Generate code |
| `F12` | Open DevTools |
| `Ctrl+/` | Comment code (in editor) |
| `Ctrl+S` | Save (browser) |
| `Ctrl+Z` | Undo (browser) |

## 🔐 Security Best Practices

- ❌ Never expose API keys in client code
- ❌ Never commit `.env.local` to Git
- ✅ Use environment variables for all secrets
- ✅ Rotate tokens regularly (monthly)
- ✅ Use strong passwords (12+ characters)
- ✅ Enable 2FA on GitHub/Netlify

## 📦 Dependencies

```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "typescript": "^5.3.0",
  "@supabase/supabase-js": "^2.38.0",
  "octokit": "^3.0.0",
  "tailwindcss": "^3.4.0"
}
```

## 🔗 Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Netlify Dashboard**: https://app.netlify.com
- **GitHub Settings**: https://github.com/settings/tokens
- **X.AI API**: https://docs.x.ai
- **Tailwind CSS**: https://tailwindcss.com/docs

## 📈 Limits

| Limit | Free | Pro |
|-------|------|-----|
| Projects | 10 | Unlimited |
| Generations/month | 50 | Unlimited |
| Deployments/month | 5 | Unlimited |
| API Requests | 50k/month | 1M/month |
| Database Size | 1GB | 100GB |

## 🆘 Getting Help

1. **Check Docs**: Start with README.md
2. **GETTING_STARTED.md**: User guide
3. **DEPLOYMENT_GUIDE.md**: Setup guide
4. **Browser Console**: Press F12 for errors
5. **API Response**: Check failed requests in Network tab

## 📞 Support Resources

- GitHub Issues: `https://github.com/roseram/builder/issues`
- Email: `support@roseram.com`
- Supabase Docs: `https://supabase.com/docs`
- Next.js Docs: `https://nextjs.org/docs`

## ✅ Pre-Deployment Checklist

- [ ] All env variables configured
- [ ] Database migrations complete
- [ ] Admin user created
- [ ] GitHub/Netlify tokens verified
- [ ] Error tracking configured (Sentry)
- [ ] Domain configured
- [ ] HTTPS enabled
- [ ] Backups scheduled

---

**Last Updated**: 2024  
For detailed docs, see main README and guide files.
