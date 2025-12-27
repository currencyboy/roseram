# Roseram Builder Platform - Setup Guide

This is a comprehensive Builder.io-like platform with Grok AI integration, Stripe payments, Sentry monitoring, and multi-platform deployment support.

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Run the quick setup script
node scripts/quick-setup.js
```

This will:
- Create `.env.local` with your credentials
- Set up required environment variables
- Guide you through integration setup

### 2. Database Migration

1. Go to [Supabase Console](https://app.supabase.com)
2. Select your project: `vwbnwribtprwtsbdrvmd`
3. Open **SQL Editor**
4. Create a new query
5. Copy the entire contents of `scripts/setup-database.sql`
6. Click **RUN** to execute

**Verify Migration:**
- Check Tables section in Supabase dashboard
- Confirm these tables exist:
  - `organizations`
  - `sites`
  - `pages`
  - `ai_generations`
  - `deployments`
  - `integrations`

### 3. Create Admin User

1. Go to **Authentication** > **Users** in Supabase
2. Click **Add user**
3. Email: `admin@roseram.com`
4. Set a secure password
5. Click **Create user**

### 4. Install Dependencies

```bash
npm install
```

### 5. Initialize Platform

```bash
node scripts/init-admin-org.js
```

This creates:
- Default admin organization
- Usage quotas for the admin account
- User settings and preferences

### 6. Start Development

```bash
npm run dev
```

Access at `http://localhost:3001`

**Login Credentials:**
- Email: `admin@roseram.com`
- Password: (the password you set)

## 📋 Feature Overview

### Core Features
✓ **Visual Page Builder** - Drag-and-drop blocks with live preview
✓ **AI Code Generation** - Generate HTML/CSS/JS with Grok
✓ **AI Content Generation** - Generate copy and sections with Grok
✓ **Multi-Site Management** - Create and manage unlimited sites
✓ **Multi-platform Deployment** - Deploy to Netlify, Vercel, GitHub Pages
✓ **Team Collaboration** - Invite team members with role-based access
✓ **Analytics** - Track page views and performance
✓ **Error Monitoring** - Sentry integration for error tracking

### Admin Features
✓ Organization Management
✓ Usage Quotas & Billing
✓ Team Member Management
✓ Integration Configuration
✓ Activity Logging
✓ Settings & Preferences

### Integration Support
- **Stripe** - Payment processing and subscriptions
- **Sentry** - Error monitoring and performance tracking
- **Netlify** - Deployment and hosting
- **Vercel** - Deployment and hosting
- **GitHub Pages** - Static site deployment
- **Grok (X.AI)** - AI-powered code and content generation

## 🔧 Integration Setup

### Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Get your API keys from **Developers** > **API Keys**
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. Set up webhook:
   - URL: `https://roseram.com/api/webhooks/stripe`
   - Events: `customer.subscription.updated`, `invoice.payment_succeeded`, `invoice.payment_failed`

### Sentry

1. Create project at [sentry.io](https://sentry.io)
2. Create a new project (Node.js runtime)
3. Get your DSN
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://...@...sentry.io/...
   SENTRY_AUTH_TOKEN=sntrys_...
   ```
5. Configure source maps in Sentry project settings

### Netlify

Already configured with:
- Site ID: `7f57fcfe-babd-4d4f-bcc0-ee1d66d9ad39`
- Access Token: Stored in `.env.local`

To use Netlify deployment:
1. Connect your GitHub repository to Netlify
2. Enable automatic deployments
3. Built sites will automatically deploy

## 📊 Database Schema Overview

### Organizations
Multi-tenant organizations with team members, integrations, and billing

### Sites
Individual websites/projects within organizations

### Pages
Pages within sites with drag-and-drop blocks

### AI Generations
Track all AI generations (code, content) with token usage

### Deployments
Track deployment history to various platforms

### Integrations
Store encrypted credentials for third-party services

### Users & Roles
- **Owner** - Full access, billing, team management
- **Admin** - Can create/edit content and manage teams
- **Editor** - Can create/edit content
- **Member** - Can view and comment
- **Viewer** - Read-only access

## 🔐 Security Best Practices

1. **Never commit secrets** - All credentials in `.env.local` (added to `.gitignore`)
2. **Use secure passwords** - Minimum 12 characters, mixed case
3. **Enable 2FA** - On Supabase and Stripe accounts
4. **Rate limiting** - Configure on Netlify dashboard
5. **CORS headers** - Configured for roseram.com domain
6. **RLS Policies** - Enabled on all database tables

## 📈 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current user

### Sites
- `GET /api/sites?organizationId=...` - List sites
- `POST /api/sites` - Create site
- `PATCH /api/sites` - Update site
- `DELETE /api/sites` - Delete site

### Pages
- `GET /api/pages?siteId=...` - List pages
- `POST /api/pages` - Create page
- `PATCH /api/pages` - Update page
- `DELETE /api/pages` - Delete page

### AI Generation
- `POST /api/ai/generate-page` - Generate page with AI
- `POST /api/ai/generate-content` - Generate content with Grok
- `POST /api/ai/generate-code` - Generate code with Grok

### Deployments
- `POST /api/deployments` - Deploy site
- `GET /api/deployments?siteId=...` - List deployments

### Integrations
- `GET /api/integrations?organizationId=...` - List integrations
- `POST /api/integrations` - Configure integration
- `DELETE /api/integrations?integrationId=...` - Remove integration

## 🚀 Deployment

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Netlify Deployment

Automatic deployment when pushing to main branch:

```bash
# Push to remote
git push origin main

# Netlify automatically builds and deploys
```

### Environment Variables for Production

Set these in Netlify dashboard under **Site settings** > **Build & deploy** > **Environment**:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
X_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NETLIFY_ACCESS_TOKEN=...
GITHUB_ACCESS_TOKEN=...
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
NEXT_PUBLIC_APP_URL=https://roseram.com
NODE_ENV=production
```

## 📚 Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Stripe Docs**: https://stripe.com/docs
- **Sentry Docs**: https://docs.sentry.io
- **Netlify Docs**: https://docs.netlify.com

## 🐛 Troubleshooting

### "Database not initialized" error
- Run the SQL migration script in Supabase SQL Editor
- Check that all tables are created
- Verify RLS policies are enabled

### "AI generation failed"
- Check that `X_API_KEY` is set correctly
- Verify Grok API is accessible
- Check API usage in X.AI dashboard

### "Deployment failed"
- Check Netlify credentials
- Verify site ID and access token
- Check Netlify build logs

### "Stripe webhook not received"
- Verify webhook URL is correct
- Check Stripe API logs
- Ensure endpoint secret matches

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs in dashboard
3. Contact support: support@roseram.com
4. Check application logs: `npm run dev` with logging enabled

## 🎯 Next Steps

1. ✅ Complete setup above
2. Create your first site in dashboard
3. Add pages using the visual builder
4. Configure team members
5. Set up payment integration
6. Deploy your first site
7. Monitor with Sentry and analytics

Enjoy building with Roseram! 🚀
