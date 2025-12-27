# Roseram Builder Platform - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER LAYER                                      │
│                   Web Browser (React Application)                        │
│                                                                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐     │
│  │  Dashboard UI   │  │ Page Builder UI   │  │  AI Generator UI   │     │
│  │  • Sites List   │  │  • Blocks         │  │  • Code Gen        │     │
│  │  • Analytics    │  │  • Preview        │  │  • Content Gen     │     │
│  │  • Settings     │  │  • Save/Publish   │  │  • Layout Gen      │     │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘     │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                    HTTPS / REST API
                           │
┌──────────────────────────▼──────────────────────────────────────────────┐
│                    APPLICATION LAYER                                     │
│              Next.js 15 + TypeScript (app/api/)                          │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Auth API   │  │   Pages API   │  │   Sites API   │  │ Deploy API │  │
│  │ • Login      │  │ • Create     │  │ • Create      │  │ • Netlify  │  │
│  │ • Register   │  │ • Read       │  │ • List        │  │ • Vercel   │  │
│  │ • Logout     │  │ • Update     │  │ • Update      │  │ • GitHub   │  │
│  │ • Sessions   │  │ • Delete     │  │ • Delete      │  │            │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  AI API      │  │ Stripe API   │  │ Integration  │  │ Analytics  │  │
│  │ • Code Gen   │  │ • Webhooks   │  │ • Config     │  │ • Tracking │  │
│  │ • Content    │  │ • Invoices   │  │ • Manage     │  │ • Metrics  │  │
│  │ • Layout     │  │ • Subscriptions  │ • Store      │  │ • Reports  │  │
│  │ • Design     │  │              │  │ Credentials  │  │            │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────────────────────┐
         │                 │                                 │
         ▼                 ▼                                 ▼
    ┌─────────────┐  ┌─���────────────┐  ┌─────────────────────────┐
    │ Supabase    │  │ External     │  │ Deployment Platforms   │
    │ PostgreSQL  │  │ Services     │  │                        │
    │             │  │              │  │ ┌────────────────────┐ │
    │ ┌─────────┐ │  │ ┌──────────┐ │  │ │ Netlify            │ │
    │ │Users    │ │  │ │ Grok AI  │ │  │ │ • Hosting          │ │
    │ │Orgs     │ │  │ │ (X.AI)   │ │  │ │ • Auto Deploy      │ │
    │ │Sites    │ │  │ │          │ │  │ │ • CDN              │ │
    │ │Pages    │ │  │ │ Stripe   │ │  │ └────────────────────┘ │
    │ │Content  │ │  │ │ • Charge │ │  │                        │
    │ │Deploy   │ │  │ │ • Invoice│ │  │ ┌────────────────────┐ │
    │ │Analytics│ │  │ │ • Events │ │  │ │ Vercel             │ │
    │ │Activity │ │  │ │          │ │  │ │ • Hosting          ��� │
    │ │Errors   │ │  │ │ Sentry   │ │  │ │ • Preview URLs     │ │
    │ └─────────┘ │  │ │ • Errors │ │  │ └────────────────────┘ │
    │             │  │ │ • Events │ │  │                        │
    │ RLS        │  │ │ • Alerts │ │  │ ┌────────────────────┐ │
    │ Encryption  │  │ │          │ │  │ │ GitHub Pages       │ │
    │ Backups     │  │ │ GitHub   │ │  │ │ • Static Deploy    │ │
    │ Audit Trail │  │ │ • OAuth  │ │  │ │ • CNAME Support    │ │
    │             │  │ │ • API    │ │  │ └────────────────────┘ │
    └─────────────┘  └──────────────┘  └─────────────────────────┘
```

---

## 📊 Data Flow Architecture

### 1. User Authentication Flow
```
User Browser
     │
     ├─ Login Form Submitted
     │        │
     ▼        ▼
    API      POST /api/auth/login
     │        │
     ├─────────
     │        ▼
     │   Supabase Auth
     │        │
     │        ├─ Validate credentials
     │        ├─ Create JWT token
     │        ▼
     │   Return session + user
     │        │
     ▼        ▼
    Store in local storage
    Set auth context
    Redirect to dashboard
```

### 2. Page Creation & Editing Flow
```
User Creates Page
     │
     ▼
POST /api/pages
     │
     ├─ Verify auth
     ├─ Check site access (RLS)
     │        │
     ▼        ▼
Supabase Insert
  ├─ Create page record
  ├─ Initialize content
  │        │
     ▼        ▼
   Return page object
     │
Update DOM
Show editor
```

### 3. AI Generation Flow
```
User Enters Prompt
     │
     ▼
POST /api/ai/generate-page
     │
     ├─ Validate prompt
     ├─ Check auth
     │        │
     ▼        ▼
  Grok API (X.AI)
     │
     ├─ Send prompt + system message
     ├─ Wait for completion
     │        │
     ▼        ▼
  Parse response
  Extract code blocks
  Count tokens
     │
     ├─ Save to ai_generations table
     ├─ Update token usage
     │        │
     ▼        ▼
   Return generated code
     │
Display in editor
Allow copying/downloading
```

### 4. Deployment Flow
```
User Clicks Deploy
     │
     ▼
POST /api/deployments
     │
     ├─ Verify auth
     ├─ Get site pages
     │        │
     ▼        ▼
Generate static files
  ├─ Combine HTML
  ├─ Merge CSS
  ├─ Merge JS
     │
     ├─ If Netlify:
     │  ├─ Get credentials
     │  ├─ Call Netlify API
     │  ├─ Upload files
     │  ├─ Wait for build
     │  │        │
     │  ▼        ▼
     │  Get live URL
     │
     ├─ Save deployment record
     │        │
     ▼        ▼
Return deployment URL
Show success message
```

### 5. Stripe Payment Flow
```
User upgrades plan
     │
     ▼
Create Stripe subscription
     │
     ├─ Get session
     ├─ Redirect to checkout
     │        │
     ▼        ▼
  Stripe Checkout
  User enters payment
  Submits card
     │
Stripe processes payment
     │
     ├─ Emits event
     │        │
     ▼        ▼
POST /api/webhooks/stripe
     │
  ├─ Verify signature
  ├─ Get event type
     │
     ├─ If subscription.updated:
     │  ├─ Find organization
     │  ├─ Update subscription status
     │
     ├─ If invoice.paid:
     │  ├─ Create invoice record
     │  ├─ Send receipt email
     │
     ▼
✓ User upgraded successfully
```

---

## 🗄️ Database Schema Overview

### Core Tables
```
organizations (root)
├── organization_members (M:M relationship)
├── sites (1:M relationship)
│   ├── pages (1:M relationship)
│   │   ├── page_versions (history)
│   │   └── page_comments
│   ├── deployments
│   └── ai_generations
├── components (reusable)
├── sections (reusable)
├── integrations (encrypted)
├── user_preferences
├── user_settings
├── invoices
├── usage_quotas
├── api_usage
├── error_logs
└── activity_logs
```

### User Roles & Permissions
```
┌──────────┬─────────┬──────────┬─────────┬────────┐
│  Owner   │  Admin  │ Editor   │ Member  │ Viewer │
├──────────┼─────────┼──────────┼─────────┼────────┤
│ Full     │ Create  │ Create   │ Comment │ View   │
│ access   │ content │ & Edit   │ only    │ only   │
│          │         │          │         │        │
│ Manage   │ Manage  │ Edit     │ Collab  │        │
│ team     │ team    │ pages    │ tools   │        │
│          │         │          │         │        │
│ Billing  │ Deploy  │ Deploy   │         │        │
│          │         │          │         │        │
└──────────┴─────────┴──────────┴─────────┴────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────┐
│ HTTPS / TLS Encryption (Transport)                  │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│ Authentication Layer                              │
│ • JWT Token Validation                            │
│ • Session Management                              │
│ • Rate Limiting (ready to implement)              │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│ Authorization Layer                               │
│ • Role-Based Access Control                       │
│ • Organization Context Checking                   │
│ • API Endpoint Guards                             │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│ Row-Level Security (Database)                     │
│ • RLS Policies on all tables                      │
│ • User isolation at database level                │
│ • Team member verification                        │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│ Data Protection                                   │
│ • Encrypted credential storage                    │
│ • Password hashing (Supabase)                     │
│ • No secrets in logs                              │
│ • Audit trails for compliance                     │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Deployment Architecture

### Development
```
Local Machine
    │
npm run dev
    │
    ├─ Next.js Dev Server (port 3001)
    ├─ Hot reload on file changes
    ├─ Connected to Supabase
    │
Terminal
```

### Production (Netlify)
```
GitHub Repository
    │
    ├─ Push to main
    │
    ▼
Netlify Automatic Deployment
    │
    ├─ Build: npm run build
    ├─ Generate: .next/
    │
    ├─ Deploy to CDN
    ├─ 100+ edge locations
    │
    ├─ DNS: custom domain
    ├─ HTTPS: auto cert
    │
    ▼
Live at roseram.com
(Automatic on each push)
```

---

## 🔄 Request/Response Cycle

```
1. USER INITIATES ACTION
   ├─ Click "Generate with AI"
   └─ Submit prompt in form

2. CLIENT-SIDE
   ├─ Validate input
   ├─ Show loading state
   └─ Send POST request

3. NETWORK
   └─ HTTPS to roseram.com/api/ai/generate-page

4. SERVER-SIDE
   ├─ Middleware validation
   ├─ Auth check (JWT)
   ├─ User/org verification
   │
   ├─ Call Grok API
   │   ├─ Send prompt
   │   ├─ Get completion
   │   └─ Parse response
   │
   ├─ Store in database
   │   ├─ ai_generations table
   │   ├─ api_usage tracking
   │   └─ activity_logs entry
   │
   └─ Return JSON response

5. CLIENT-SIDE
   ├─ Parse response
   ├─ Update UI
   ├─ Show generated code
   └─ Hide loading state

6. USER
   ├─ Copy code
   ├─ Download file
   └─ Edit further
```

---

## 🚀 Scaling Architecture

### Current Configuration
- Single Supabase instance
- Supabase auto-scaling for connections
- Netlify global CDN
- No bottlenecks for small scale

### For Enterprise Scale
```
┌─────────────────────────────┐
│   Load Balancer             │
│   (Multiple Regions)        │
└────────────┬────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼──┐ ┌──▼─��─┐ ┌─▼────┐
│ API  │ │ API  │ │ API  │
│ US   │ │ EU   │ │ ASIA │
└───┬──┘ └──┬───┘ └─┬────┘
    │       │       │
    └───────┼───────┘
            │
    ┌───────▼────────┐
    │ Supabase       │
    │ Database       │
    │ (Replicated)   │
    └────────────────┘
```

---

## ✨ Future Enhancement Points

```
Current System
    │
    ├─ Add WebSocket for real-time collab
    ├─ Implement message queue (Bull)
    ├─ Add Redis caching layer
    ├─ Multi-region database replication
    ├─ Advanced analytics dashboard
    ├─ Component marketplace
    ├─ White-label support
    └─ Mobile native app

All infrastructure ready for these enhancements
```

---

## 📈 Performance Metrics

### Expected Performance
- API Response: < 200ms
- Page Load: < 2s
- AI Generation: 5-30s (depends on prompt)
- Deployment: 1-5 minutes

### Optimization Ready
- Database indexes on all key fields
- RLS policies optimized
- API routes use async/await
- Compression enabled
- CDN enabled
- Caching ready to implement

---

## 🎯 Key Architecture Decisions

1. **Supabase** - Managed PostgreSQL with built-in auth & RLS
2. **Next.js** - Full-stack React with API routes
3. **Netlify** - Global CDN with auto deployments
4. **Grok AI** - State-of-the-art open AI model
5. **Stripe** - Industry-standard payments
6. **Sentry** - Enterprise error tracking

All decisions prioritize:
- Scalability
- Security
- Developer experience
- Cost efficiency
- Performance

---

End of architecture documentation. System is production-ready! 🚀
