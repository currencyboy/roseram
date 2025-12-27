#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(q) {
  return new Promise(resolve => {
    rl.question(q, resolve);
  });
}

async function setupPlatform() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Roseram Builder Platform - Initial Setup                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Check for existing .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      console.log('✓ .env.local already exists\n');
    } else {
      console.log('Creating .env.local...');
      const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AI/Grok Configuration
X_API_KEY=your_x_api_key_here
NEXT_PUBLIC_AI_MODEL=grok-4

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
NODE_ENV=development
`;

      fs.writeFileSync(envPath, envContent);
      console.log('✓ .env.local created\n');
    }

    // Verify required directories
    const dirs = ['components', 'lib', 'pages', 'public', 'scripts'];
    dirs.forEach(dir => {
      const dirPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    console.log('✓ Directories verified\n');

    // Database setup instructions
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Database Setup Instructions                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('To setup your Supabase database:');
    console.log('1. Go to: https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Create a new query');
    console.log('5. Copy and paste the content of: scripts/setup-database.sql');
    console.log('6. Click "RUN" to execute all migrations\n');

    // Admin user setup
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Admin User Setup                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Admin account: admin@roseram.com');
    console.log('To create the admin user:');
    console.log('1. Go to: https://app.supabase.com > Authentication > Users');
    console.log('2. Click "Add user"');
    console.log('3. Email: admin@roseram.com');
    console.log('4. Set a secure password');
    console.log('5. Click "Create user"\n');

    // Feature overview
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Platform Features Enabled                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('✓ Page Builder with Drag & Drop');
    console.log('✓ AI Code Generation (Grok)');
    console.log('✓ AI Content Generation (Grok)');
    console.log('✓ Multi-platform Deployment (Netlify, Vercel, GitHub Pages)');
    console.log('✓ Stripe Payment Integration');
    console.log('✓ Sentry Error Monitoring');
    console.log('✓ Team Collaboration');
    console.log('✓ Custom Domains');
    console.log('✓ Analytics & Reporting\n');

    // Next steps
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Next Steps                                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('1. Update .env.local with your actual credentials:');
    console.log('   - Supabase URL and keys');
    console.log('   - X.AI API key');
    console.log('   - Stripe keys (optional)');
    console.log('   - Sentry DSN (optional)\n');

    console.log('2. Complete Database Setup:');
    console.log('   npm run setup-db\n');

    console.log('3. Install Dependencies:');
    console.log('   npm install\n');

    console.log('4. Start Development:');
    console.log('   npm run dev\n');

    console.log('5. Open in Browser:');
    console.log('   http://localhost:3001\n');

    console.log('6. Login with:');
    console.log('   Email: admin@roseram.com');
    console.log('   Password: (your secure password)\n');

    console.log('For detailed documentation, visit: https://roseram.com/docs\n');

    rl.close();
  } catch (error) {
    console.error('Setup error:', error);
    rl.close();
    process.exit(1);
  }
}

setupPlatform();
