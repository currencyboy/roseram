-- Create sprites_preview_instances table for tracking sprite-based preview environments
CREATE TABLE IF NOT EXISTS public.sprites_preview_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sprite_name TEXT NOT NULL UNIQUE,
  
  -- Repository details
  github_repo_url TEXT NOT NULL,
  github_branch TEXT NOT NULL,
  
  -- Sprite status
  status TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'running', 'error', 'stopped')),
  port INTEGER,
  preview_url TEXT,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  destroyed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX idx_sprites_user_project ON public.sprites_preview_instances(user_id, project_id);
CREATE INDEX idx_sprites_status ON public.sprites_preview_instances(status);
CREATE INDEX idx_sprites_sprite_name ON public.sprites_preview_instances(sprite_name);

-- Enable RLS (Row Level Security)
ALTER TABLE public.sprites_preview_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own sprites
CREATE POLICY "Users can view own sprites" ON public.sprites_preview_instances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sprites" ON public.sprites_preview_instances
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sprites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS sprites_update_timestamp ON public.sprites_preview_instances;
CREATE TRIGGER sprites_update_timestamp
  BEFORE UPDATE ON public.sprites_preview_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_sprites_timestamp();
