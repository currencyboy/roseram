# 🚀 Roseram Builder Platform

**A comprehensive, production-ready Builder.io-like page builder platform with AI-powered code generation (Grok), multi-platform deployment, team collaboration, and enterprise features.**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-green)](https://github.com/roseram/builder)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](https://github.com/roseram/builder/releases)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)

---

## 📋 Quick Overview

Roseram Builder is a full-featured platform for creating, deploying, and managing websites at scale. It combines:

- **Visual Page Builder** - Drag-and-drop interface with live preview
- **AI-Powered Generation** - Grok AI for instant code and content generation
- **Multi-Platform Deployment** - One-click deploy to Netlify, Vercel, GitHub Pages
- **Team Collaboration** - Role-based access, team management, activity logs
- **Enterprise Features** - Billing, analytics, error monitoring, audit trails

Perfect for agencies, SaaS platforms, or anyone building professional websites programmatically.

---

## ⚡ Features

### Page Builder
- ✅ Drag-and-drop visual editor
- ✅ Pre-built block templates (hero, features, pricing, testimonials, CTA)
- ✅ Real-time preview
- ✅ Version history and rollback
- ✅ Custom CSS and JavaScript support
- ✅ Responsive design tools

### AI Integration (Grok)
- ✅ **Code Generation** - HTML/CSS/JavaScript from natural language
- ✅ **Content Generation** - Copy, headlines, sections
- ✅ **Layout Generation** - Complete page structures
- ✅ **Design Suggestions** - AI-powered design recommendations
- ✅ **Token Usage Tracking** - Monitor AI costs
- ✅ **Conversation History** - Multi-turn generation

### Deployment
- ✅ Netlify (with auto-deploy)
- ✅ Vercel support
- ✅ GitHub Pages integration
- ✅ Custom domain support
- ✅ Deployment history
- ✅ Build logs and error reporting

### Team & Organization
- ✅ Multi-tenant organization system
- ✅ 5 Role types (Owner, Admin, Editor, Member, Viewer)
- ✅ Role-based permissions
- ✅ Activity audit trails
- ✅ Team member management
- ✅ Organization settings

### Billing & Subscriptions
- ✅ Stripe integration
- ✅ Subscription management
- ✅ Usage quotas and limits
- ✅ Invoice tracking
- ✅ Webhook handling
- ✅ Plan management (Free, Pro, Enterprise)

### Analytics & Monitoring
- ✅ Page view tracking
- ✅ User engagement metrics
- ✅ Error logging (Sentry ready)
- ✅ API usage monitoring
- ✅ Performance tracking
- ✅ Activity logs

### Security
- ✅ Supabase Auth (industry-standard)
- ✅ Row-Level Security (RLS) on all tables
- ✅ Encrypted credential storage
- ✅ HTTPS/TLS everywhere
- ✅ Audit trails for compliance
- ✅ Session management

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier available)
- Grok API key (X.AI)
- Optional: Stripe account for payments

### Installation (5 Minutes)

```bash
# 1. Clone repository
git clone https://github.com/roseram/builder.git
cd builder

# 2. Install dependencies
npm install

# 3. Run interactive setup
node scripts/quick-setup.js
```

This will guide you through:
- Creating `.env.local` with your credentials
- Configuring API keys (Grok, Stripe, etc.)
- Setting up your integration preferences

### Database Setup

```bash
# 1. Go to Supabase Console
# https://app.supabase.com

# 2. Select your project

# 3. Open SQL Editor

# 4. Create new query

# 5. Copy & paste this file:
# scripts/setup-database-fixed.sql

# 6. Click RUN
```

### Admin User Setup

1. **Create user in Supabase:**
   - Go to Authentication > Users
   - Click "Add user"
   - Email: `admin@roseram.com`
   - Password: (your secure password)

2. **Initialize admin organization:**
   ```bash
   node scripts/init-admin-org.js
   ```

### Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3001**

Login with:
- Email: `admin@roseram.com`
- Password: (your password)

---

## 📁 Project Structure

```
roseram-builder/
├── app/
│   ├── api/                    # REST API endpoints
│   │   ├── ai/                # AI generation
│   │   ├── pages/             # Page management
│   │   ├── sites/             # Site management
│   │   ├── deployments/       # Deployment handling
│   │   ├── integrations/      # Integration setup
│   │   ├���─ webhooks/          # Webhook handlers
│   │   └── auth/              # Auth endpoints
│   ├── dashboard/             # Dashboard UI
│   │   ├── page.tsx           # Main dashboard
│   │   ├── ai-generator/      # AI generator UI
│   │   ├── sites/             # Site management UI
│   │   ├── analytics/         # Analytics dashboard
│   │   └── settings/          # Settings pages
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
│
├── components/                # Reusable React components
│   ├── DashboardLayout.tsx    # Navigation & layout
│   ├── PageBuilder.tsx        # Visual builder
│   └── ...
│
├── lib/                       # Utilities & helpers
│   ├── grok-ai.ts            # Grok integration
│   ├── supabase.ts           # Supabase client
│   ├── auth.ts               # Auth utilities
│   ├── errors.ts             # Error handling
│   ├── constants.ts          # App constants
│   └── types.ts              # TypeScript types
│
├── scripts/                   # Setup & deployment
│   ├── setup-database-fixed.sql     # Database schema ⭐ START HERE
│   ├── quick-setup.js        # Interactive setup
│   ├── init-admin-org.js     # Admin initialization
│   └── deploy.sh             # Production deployment
│
├── public/                    # Static assets
├── .env.local                # Environment variables (ignored)
├── package.json              # Dependencies
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind config
├── tsconfig.json             # TypeScript config
│
├── DEPLOYMENT_SUMMARY.md     # Quick start guide
├── PLATFORM_SETUP.md         # Detailed setup
├── BUILDER_IO_MIGRATION.md   # Feature list
├── SYSTEM_ARCHITECTURE.md    # Technical docs
├── IMPLEMENTATION_TIMELINE.md # Project plan
└── README.md                 # This file
```

---

## 🔧 Configuration

### Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Grok AI (Required)
X_API_KEY=xai-...
NEXT_PUBLIC_AI_MODEL=grok-2-latest

# Stripe (Optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Netlify (Optional)
NETLIFY_SITE_ID=...
NETLIFY_ACCESS_TOKEN=...

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://...

# Application
NEXT_PUBLIC_APP_URL=https://roseram.com
NODE_ENV=production
```

---

## 📚 API Documentation

### Authentication
```
POST   /api/auth/login           Login user
POST   /api/auth/logout          Logout user
GET    /api/auth/user            Get current user
```

### Sites
```
GET    /api/sites?organizationId=...    List sites
POST   /api/sites                       Create site
PATCH  /api/sites/:id                   Update site
DELETE /api/sites/:id                   Delete site
```

### Pages
```
GET    /api/pages?siteId=...     List pages
POST   /api/pages                Create page
PATCH  /api/pages/:id            Update page
DELETE /api/pages/:id            Delete page
```

### AI Generation
```
POST   /api/ai/generate-page     Generate page with AI
POST   /api/ai/generate-content  Generate content
```

### Deployments
```
POST   /api/deployments              Deploy site
GET    /api/deployments?siteId=...   List deployments
```

### Integrations
```
GET    /api/integrations?organizationId=...  List
POST   /api/integrations                      Configure
DELETE /api/integrations?integrationId=...   Remove
```

Full API documentation: See [API Reference](./API.md) (coming soon)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│        React/Next.js Frontend           │
│     (Dashboard + Page Builder UI)       │
└──────────────────┬──────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────┐
│      Next.js API Routes (Backend)       │
│  • Authentication • Pages • Sites       │
│  • AI Generation  • Deployments         │
│  • Payments & Webhooks • Analytics     │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    Supabase   Grok API   Stripe
    (Database)  (X.AI)    (Payments)
```

For detailed architecture: See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)

---

## 📊 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | Supabase (PostgreSQL), RLS |
| **Auth** | Supabase Auth, JWT |
| **AI** | Grok (X.AI), OpenAI-compatible |
| **Payments** | Stripe |
| **Monitoring** | Sentry |
| **Deployment** | Netlify, Vercel, GitHub Pages |
| **Hosting** | Netlify, Vercel, Self-hosted |

---

## 🚀 Deployment

### To Netlify (Recommended)

```bash
# 1. Push to GitHub
git push origin main

# 2. Netlify automatically:
# - Builds (npm run build)
# - Deploys to CDN
# - Sets up HTTPS
```

### Production Environment Variables

Set these in your deployment platform:
- All variables from `.env.local`
- Override with production URLs
- Never commit secrets to git

---

## 🧪 Development

### Available Scripts

```bash
npm run dev           # Start development server (port 3001)
npm run build         # Build for production
npm start             # Start production server
npm run lint          # Run ESLint
npm run type-check    # Check TypeScript
npm run setup         # Interactive setup wizard
npm run init-admin    # Initialize admin account
npm run deploy        # Run deployment script
npm run setup-db      # Database setup instructions
```

### Database Migrations

All migrations are SQL-based. To run new migrations:

1. Go to Supabase SQL Editor
2. Create new query
3. Copy SQL migration
4. Run the query

See [scripts/setup-database-fixed.sql](./scripts/setup-database-fixed.sql) for the complete schema.

---

## 🔐 Security & Best Practices

### ✅ Implemented
- Row-Level Security (RLS) on all database tables
- Encrypted credential storage for integrations
- Password hashing via Supabase Auth
- JWT token validation on all endpoints
- CORS headers properly configured
- Activity audit trails for compliance
- Error handling without exposing internals

### 🔒 Before Production
- [ ] Enable HTTPS (automatic on Netlify)
- [ ] Configure rate limiting
- [ ] Setup database backups
- [ ] Enable error monitoring (Sentry)
- [ ] Review RLS policies
- [ ] Configure firewall rules
- [ ] Setup email notifications
- [ ] Review privacy policy

---

## 📈 Scaling

### Current Setup Handles
- Unlimited organizations
- Unlimited users per organization
- Unlimited sites per organization
- Unlimited pages per site
- Auto-scaling database connections

### For Enterprise Scale
- Setup database replication
- Add caching layer (Redis)
- Implement message queues
- Deploy to multiple regions
- Configure CDN properly

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) (coming soon)

---

## 📞 Support & Help

### Documentation
- [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) - Quick start
- [PLATFORM_SETUP.md](./PLATFORM_SETUP.md) - Detailed setup
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Architecture
- [IMPLEMENTATION_TIMELINE.md](./IMPLEMENTATION_TIMELINE.md) - Project plan

### Troubleshooting
- Check browser console for errors
- Review Supabase logs in dashboard
- Check build logs in Netlify/Vercel
- Review API responses in Network tab
- Enable debug mode: `DEBUG=* npm run dev`

### Getting Help
- Check documentation first
- Search existing issues
- Create an issue with details
- Contact support: support@roseram.com

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

---

## 🎯 Roadmap

### Phase 1 (Current - MVP)
- ✅ Page builder with visual editing
- ✅ AI code generation with Grok
- ✅ Multi-platform deployment
- ✅ Team collaboration
- ✅ Basic analytics

### Phase 2 (Next 3 Months)
- [ ] Component marketplace
- [ ] Advanced design tools
- [ ] Real-time collaboration (WebSockets)
- [ ] Email builder
- [ ] Form builder with integrations

### Phase 3 (Future)
- [ ] Mobile app
- [ ] White-label solution
- [ ] Plugin system
- [ ] Advanced AI features
- [ ] API for third parties

---

## 🌟 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Open-source Firebase
- [Grok AI](https://x.ai/) - Advanced AI model
- [Stripe](https://stripe.com/) - Payment processing
- [Netlify](https://netlify.com/) - Deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - Utility CSS

---

## 📧 Contact

- **Website**: https://roseram.com
- **Email**: support@roseram.com
- **Twitter**: [@roserambuilder](https://twitter.com/roserambuilder)
- **GitHub**: [github.com/roseram/builder](https://github.com/roseram/builder)

---

**Made with ❤️ by Roseram** | [Get Started Now](./PLATFORM_SETUP.md)
