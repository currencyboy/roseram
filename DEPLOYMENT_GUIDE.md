# Roseram Builder - Deployment Guide

This guide covers deploying Roseram Builder to production on roseram.com using Netlify and Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Environment Variables](#environment-variables)
5. [GitHub Integration](#github-integration)
6. [Netlify Deployment](#netlify-deployment)
7. [Domain Configuration](#domain-configuration)
8. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Node.js 18+
- Git account
- Supabase account (free tier available)
- Netlify account
- GitHub account
- X.AI API key (for Grok/code generation)
- Custom domain (roseram.com)

## Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/roseram-builder.git
cd roseram-builder
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE=your_service_role_key

# X.AI (Grok)
X_API_KEY=your_x_api_key

# GitHub (Optional - for app integration)
GITHUB_ACCESS_TOKEN=your_github_token

# Netlify (Optional - for app deployment)
VITE_NETLIFY_ACCESS_TOKEN=your_netlify_token
VITE_NETLIFY_SITE_ID=your_site_id

# Admin User
ADMIN_EMAIL=admin@roseram.com
ADMIN_PASSWORD=your_secure_password

# Node Environment
NODE_ENV=development
```

### 3. Initialize Database

```bash
npm run setup-auth
```

This creates the admin user in Supabase.

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3001`

## Supabase Configuration

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database initialization
4. Get API keys from Settings > API

### 2. Run Database Migrations

1. Go to Supabase Dashboard > SQL Editor
2. Run all migrations from `SUPABASE_SCHEMA.md`
3. Enable Row Level Security (RLS) on all tables
4. Create RLS policies as documented

### 3. Verify Tables

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Should show:
- projects
- chat_messages
- deployments
- user_preferences
- user_integrations
- api_usage
- error_logs

## Environment Variables

### Development (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_PROJECT_URL=
SUPABASE_SERVICE_ROLE=
X_API_KEY=
ADMIN_EMAIL=admin@roseram.com
ADMIN_PASSWORD=
NODE_ENV=development
```

### Production (Netlify)

Set these in Netlify Dashboard > Site Settings > Build & Deploy > Environment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_PROJECT_URL=
SUPABASE_SERVICE_ROLE=
X_API_KEY=
ADMIN_EMAIL=admin@roseram.com
ADMIN_PASSWORD=
NODE_ENV=production
SETUP_KEY=your_secure_setup_key
```

**Never commit `.env.local` to Git!**

## GitHub Integration

### 1. Create Personal Access Token

1. Go to GitHub > Settings > Developer settings > Personal access tokens
2. Click "Generate new token"
3. Select scopes:
   - `repo` - Full control of repositories
   - `user:email` - Read user email
4. Copy token to `.env.local`

### 2. Setup GitHub App (Optional)

For production, use GitHub App for better security:

1. Go to GitHub > Settings > Developer settings > GitHub Apps
2. Create new GitHub App
3. Set permissions:
   - Repository: Contents (read/write)
   - Repository: Pull requests (read/write)
4. Generate private key
5. Update environment variables

## Netlify Deployment

### 1. Connect Repository to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect GitHub repository
4. Select `roseram-builder` repo
5. Configure build:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18

### 2. Set Environment Variables

In Netlify Dashboard:

1. Go to Site settings > Build & Deploy > Environment
2. Add all production environment variables
3. **Save** (do not deploy yet)

### 3. Deploy

Netlify will automatically:
1. Run `npm install`
2. Run `npm run build`
3. Deploy to default domain: `your-site.netlify.app`

Check build logs: Site > Deploys > Recent deploys

### 4. Setup Continuous Deployment

Push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Deploy updates"
git push origin main
```

Netlify will:
- Build automatically
- Run tests (if configured)
- Deploy to staging/production

## Domain Configuration

### 1. Connect Custom Domain

In Netlify Dashboard:

1. Domain management > Custom domains
2. Add `roseram.com`
3. Follow DNS setup instructions

### 2. Configure DNS

At your domain registrar (GoDaddy, Namecheap, etc.):

Update nameservers to Netlify's:
- `dns1.p07.nsone.net`
- `dns2.p07.nsone.net`
- `dns3.p07.nsone.net`
- `dns4.p07.nsone.net`

Or add CNAME record:
- Name: `www`
- Value: `your-site.netlify.app`

### 3. Enable HTTPS

Netlify automatically:
1. Provisions SSL certificate (Let's Encrypt)
2. Redirects HTTP to HTTPS
3. Enables HSTS

## API Keys & Secrets

### X.AI (Grok) API Key

1. Go to [x.ai](https://x.ai)
2. Get API key from dashboard
3. Keep secret - never commit to Git
4. Rotate periodically

### GitHub Token

- Scopes needed: `repo`, `user:email`
- Expires: 1 year (GitHub classic tokens)
- Rotate before expiration

### Netlify Token

1. Account settings > Applications > Personal access tokens
2. Generate new token with:
   - sites:read
   - sites:write
   - builds:read
   - builds:write
3. Store securely

## Monitoring & Maintenance

### 1. Error Tracking

Integrate Sentry:

```bash
npm install @sentry/nextjs
```

In `next.config.ts`:

```typescript
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(
  nextConfig,
  {
    org: "your-org",
    project: "roseram-builder",
  }
);
```

### 2. Performance Monitoring

Netlify automatically provides:
- Build analytics
- Deploy history
- Function usage

Access via: Site > Analytics

### 3. Database Backups

Supabase automatically backs up daily. Manual backup:

```bash
# Export via Supabase CLI
npx supabase db pull --file backup.sql
```

### 4. Log Monitoring

Check logs in:
- **Netlify**: Deploys > Build logs
- **Supabase**: Logs > Postgres logs
- **Sentry** (if configured): Error tracking

### 5. Regular Maintenance

**Weekly**:
- Review error logs
- Check deployment status
- Monitor API usage

**Monthly**:
- Rotate tokens
- Update dependencies
- Review security settings

**Quarterly**:
- Backup database
- Review costs
- Audit user permissions

## Troubleshooting

### Build Fails

Check Netlify build logs:
1. Site > Deploys > Recent deploy
2. View deploy log
3. Common issues:
   - Missing env variables
   - Node version mismatch
   - Dependency conflicts

### Database Connection Issues

```bash
# Test Supabase connection
curl -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://YOUR_PROJECT.supabase.co/rest/v1/projects
```

### API Key Issues

Verify in `.env.local`:
- Keys are not expired
- Keys have correct permissions
- Keys are not accidentally logged

### Domain Not Resolving

1. Check DNS: `nslookup roseram.com`
2. Verify Netlify DNS settings
3. Wait 24-48 hours for propagation
4. Clear browser cache

## Production Checklist

Before going live:

- [ ] All env variables configured
- [ ] Database migrations complete
- [ ] RLS policies enabled
- [ ] Admin user created
- [ ] GitHub/Netlify tokens verified
- [ ] Domain DNS configured
- [ ] HTTPS enabled
- [ ] Error tracking setup
- [ ] Database backups configured
- [ ] Monitoring enabled
- [ ] Security review complete

## Support & Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Docs](https://supabase.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [X.AI API Docs](https://docs.x.ai)

## Security Notes

1. **Never commit secrets** - Use `.gitignore`
2. **Rotate tokens periodically** - Monthly for Netlify/GitHub
3. **Use environment variables** - All configuration
4. **Enable 2FA** - On all accounts
5. **Monitor usage** - Check API rates and costs
6. **Keep dependencies updated** - `npm update --save`
7. **Review access logs** - Supabase and Netlify
8. **Backup regularly** - Database and code

## Cost Optimization

- **Supabase**: Free tier includes 1GB database, 100GB bandwidth
- **Netlify**: Free tier for static sites, $20/month for functions
- **X.AI API**: Usage-based pricing (estimate $10-50/month for MVP)
- **Domain**: ~$12/year

Total estimated: **$10-100/month** depending on usage.

## Next Steps

1. ✅ Deploy to production
2. Set up monitoring
3. Add custom features
4. Scale infrastructure as needed
5. Consider team collaboration features

---

**Last Updated**: 2024
**Version**: 1.0
