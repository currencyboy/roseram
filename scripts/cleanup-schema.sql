-- =====================================================
-- ROSERAM BUILDER - SCHEMA CLEANUP
-- Removes unused tables, columns, and constraints
-- =====================================================
-- WARNING: This script drops data. Make sure you have backups!
-- =====================================================

BEGIN;

-- Phase 1: Drop completely unused tables
-- These tables are in the schema but never referenced in the codebase

DROP TABLE IF EXISTS public.user_settings CASCADE;
-- Reason: Not used anywhere in the codebase. User preferences are stored in user_preferences instead.

DROP TABLE IF EXISTS public.page_versions CASCADE;
-- Reason: Not used. Page versioning not implemented in current application.

DROP TABLE IF EXISTS public.components CASCADE;
-- Reason: Not used. Component library feature not implemented.

DROP TABLE IF EXISTS public.sections CASCADE;
-- Reason: Not used. Sections library feature not implemented.

DROP TABLE IF EXISTS public.ai_generations CASCADE;
-- Reason: Not used. AI content generation feature not implemented.

DROP TABLE IF EXISTS public.ai_conversations CASCADE;
-- Reason: Not used. AI conversations feature not implemented.

DROP TABLE IF EXISTS public.usage_quotas CASCADE;
-- Reason: Not used. Usage quota tracking not implemented.

DROP TABLE IF EXISTS public.error_logs CASCADE;
-- Reason: Not used. Error logging handled externally (Sentry, etc).

DROP TABLE IF EXISTS public.page_analytics CASCADE;
-- Reason: Not used. Page analytics not implemented.

DROP TABLE IF EXISTS public.page_comments CASCADE;
-- Reason: Not used. Page comments feature not implemented.

-- Phase 2: Remove unused columns from active tables
-- These are columns that exist but are never read or written to

-- Remove unused columns from file_snapshots
ALTER TABLE IF EXISTS public.file_snapshots
  DROP COLUMN IF EXISTS original_content,
  DROP COLUMN IF EXISTS modified_content,
  DROP COLUMN IF EXISTS language;

-- Remove unused columns from projects
ALTER TABLE IF EXISTS public.projects
  DROP COLUMN IF EXISTS generated_code,
  DROP COLUMN IF EXISTS github_url,
  DROP COLUMN IF EXISTS netlify_url,
  DROP COLUMN IF EXISTS github_branch;

-- Remove unused columns from deployments
ALTER TABLE IF EXISTS public.deployments
  DROP COLUMN IF EXISTS project_id,
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS url,
  DROP COLUMN IF EXISTS deploy_id;

-- Remove unused columns from actions
ALTER TABLE IF EXISTS public.actions
  DROP COLUMN IF EXISTS project_id,
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS action_type,
  DROP COLUMN IF EXISTS file_path,
  DROP COLUMN IF EXISTS code_content,
  DROP COLUMN IF EXISTS metadata;

-- Remove unused columns from code_versions
ALTER TABLE IF EXISTS public.code_versions
  DROP COLUMN IF EXISTS file_path,
  DROP COLUMN IF EXISTS code_content,
  DROP COLUMN IF EXISTS language;

-- Remove unused columns from history_snapshots
ALTER TABLE IF EXISTS public.history_snapshots
  DROP COLUMN IF EXISTS action_id;

-- Phase 3: Remove redundant or conflicting constraints
-- Add specific constraint removals if needed (these are examples)

-- Drop any duplicate unique constraints
-- DROP CONSTRAINT IF EXISTS (constraint_name) ON table_name;

-- Phase 4: Verify remaining tables and structure
-- The following tables are essential and should remain:

-- Core tables:
-- - organizations (team/org management)
-- - organization_members (team member roles)
-- - projects (coding projects)
-- - sites (website builder)
-- - pages (website pages)
-- - chat_messages (AI chat history)
-- - deployments (deployment tracking)
-- - user_preferences (user settings)
-- - user_sessions (session management)

-- Integration tables:
-- - integrations (org-level integrations)
-- - user_integrations (user-level integrations)
-- - user_env_vars (environment variables)

-- Billing & Usage tables:
-- - solana_payments (payment records)
-- - api_usage_logs (API usage tracking)
-- - user_ai_usage (AI usage per user)
-- - invoices (billing invoices)

-- Activity tables:
-- - activity_logs (audit trail)
-- - action_logs (action tracking)

-- File management:
-- - file_revisions (version history)
-- - file_snapshots (file backups)

-- Code tracking:
-- - code_versions (code version history)
-- - history_snapshots (complete state snapshots)

COMMIT;
