#!/bin/bash

# =====================================================
# Roseram Builder - Database Schema Fix
# Fixes missing columns and tables in Supabase
# =====================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Roseram Builder - Database Schema Fix                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js first"
    exit 1
fi

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_PROJECT_URL" ] && [ -z "$SUPABASE_PROJECT_URL" ]; then
    echo "❌ Supabase project URL not found"
    echo "Please set NEXT_PUBLIC_SUPABASE_PROJECT_URL or SUPABASE_PROJECT_URL"
    exit 1
fi

if [ -z "$NEXT_SUPABASE_SERVICE_ROLE" ] && [ -z "$SUPABASE_SERVICE_ROLE" ]; then
    echo "❌ Supabase service role key not found"
    echo "Please set NEXT_SUPABASE_SERVICE_ROLE or SUPABASE_SERVICE_ROLE"
    exit 1
fi

echo "📡 Environment variables detected"
echo ""

# Run the Node.js schema rebuild script
echo "🔧 Running schema rebuild..."
node "$(dirname "$0")/schema-rebuild.js"

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Database schema has been fixed!"
    echo ""
    echo "Next steps:"
    echo "  1. If your dev server is running, restart it: npm run dev"
    echo "  2. Try creating a site or page - the slug error should be gone"
    echo ""
else
    echo ""
    echo "❌ Schema rebuild failed with exit code $exit_code"
    exit $exit_code
fi
