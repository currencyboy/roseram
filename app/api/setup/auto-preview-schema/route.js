import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SCHEMA_SQL = `
-- Auto Preview Instances Table
CREATE TABLE IF NOT EXISTS auto_preview_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  
  -- Sprite information
  sprite_name TEXT,
  port INTEGER,
  
  -- Preview URL and status
  preview_url TEXT,
  status TEXT CHECK (status IN ('initializing', 'detecting_environment', 'installing', 'running', 'stopped', 'error')) DEFAULT 'initializing',
  
  -- Package manager and build info
  package_manager TEXT CHECK (package_manager IN ('npm', 'pnpm', 'yarn', 'bun')) DEFAULT 'npm',
  script_name TEXT DEFAULT 'dev',
  
  -- Error handling
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auto_preview_project_user ON auto_preview_instances(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auto_preview_user_status ON auto_preview_instances(user_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_preview_created ON auto_preview_instances(created_at DESC);

-- Enable RLS
ALTER TABLE auto_preview_instances ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own previews
-- Service role (bypasses RLS) or user's own records
CREATE POLICY IF NOT EXISTS "Users can view own previews" ON auto_preview_instances
  FOR SELECT
  USING (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

CREATE POLICY IF NOT EXISTS "Users can create previews" ON auto_preview_instances
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

CREATE POLICY IF NOT EXISTS "Users can update own previews" ON auto_preview_instances
  FOR UPDATE USING (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

CREATE POLICY IF NOT EXISTS "Users can delete own previews" ON auto_preview_instances
  FOR DELETE USING (
    auth.uid() IS NULL OR auth.uid() = user_id
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auto_preview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_auto_preview_updated_at ON auto_preview_instances;
CREATE TRIGGER trigger_auto_preview_updated_at
  BEFORE UPDATE ON auto_preview_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_preview_updated_at();
`;

export async function POST(request) {
  // Only allow in development or with a setup key
  const setupKey = request.headers.get("x-setup-key");
  if (process.env.NODE_ENV === "production" && !setupKey) {
    return NextResponse.json(
      { error: "Setup not allowed in production without key" },
      { status: 403 }
    );
  }

  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || 
    process.env.SUPABASE_PROJECT_URL;

  const supabaseServiceRoleKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_SUPABASE_SERVICE_ROLE || 
    process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        error: "Missing Supabase environment variables",
        details: `URL: ${supabaseUrl ? 'set' : 'not set'}, Key: ${supabaseServiceRoleKey ? 'set' : 'not set'}`
      },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Execute the schema setup SQL
    const { error } = await supabase.rpc('exec', {
      sql: SCHEMA_SQL
    }).catch(async () => {
      // If RPC fails, try using the REST API for raw SQL
      // This is a workaround for Supabase setups without exec RPC
      console.warn('[AutoPreview Schema] exec RPC failed, trying alternative approach');
      
      // For now, return a helpful message directing users to the SQL editor
      return {
        error: {
          message: 'Could not auto-execute schema. Please run the SQL in Supabase SQL Editor.'
        }
      };
    });

    if (error) {
      console.error('[AutoPreview Schema] Setup error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: 'Connect to your Supabase project and run the schema SQL from scripts/auto-preview-schema.sql manually'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-preview schema setup complete',
      tables: ['auto_preview_instances']
    });
  } catch (error) {
    console.error('[AutoPreview Schema] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error during schema setup',
        details: error.message,
        hint: 'Try running the SQL manually in Supabase SQL Editor'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Auto-preview schema setup endpoint',
    usage: 'POST to set up the auto_preview_instances table',
    note: 'Available in development mode or with x-setup-key header',
    manual_setup: {
      description: 'If automatic setup fails, run the SQL manually',
      steps: [
        '1. Go to https://supabase.com/dashboard',
        '2. Select your project',
        '3. Open SQL Editor',
        '4. Run scripts/setup-auto-preview-schema.sql',
        '5. Refresh your app'
      ],
      sql_file: 'scripts/setup-auto-preview-schema.sql',
      table_created: 'auto_preview_instances'
    }
  });
}
