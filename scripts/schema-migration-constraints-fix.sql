-- ============================================================================
-- PHASE 2.5: DROP EXISTING CONSTRAINTS (if any) BEFORE ADDING NEW ONES
-- PostgreSQL does NOT support "ADD CONSTRAINT IF NOT EXISTS"
-- So we must DROP IF EXISTS first, then ADD CONSTRAINT
-- ============================================================================

-- Drop existing FK constraints if they exist (so we can recreate them cleanly)
ALTER TABLE IF EXISTS public.sites DROP CONSTRAINT IF EXISTS sites_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.components DROP CONSTRAINT IF EXISTS components_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.sections DROP CONSTRAINT IF EXISTS sections_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.integrations DROP CONSTRAINT IF EXISTS integrations_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.invoices DROP CONSTRAINT IF EXISTS invoices_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.usage_quotas DROP CONSTRAINT IF EXISTS usage_quotas_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.api_usage DROP CONSTRAINT IF EXISTS api_usage_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.error_logs DROP CONSTRAINT IF EXISTS error_logs_organization_id_fk CASCADE;
ALTER TABLE IF EXISTS public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_organization_id_fk CASCADE;

-- ============================================================================
-- PHASE 3: ADD FOREIGN KEY CONSTRAINTS (now that we've cleaned up old ones)
-- ============================================================================

-- Add FK constraint for sites
ALTER TABLE public.sites
ADD CONSTRAINT sites_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for components
ALTER TABLE public.components
ADD CONSTRAINT components_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for sections
ALTER TABLE public.sections
ADD CONSTRAINT sections_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for integrations
ALTER TABLE public.integrations
ADD CONSTRAINT integrations_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for invoices
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for usage_quotas
ALTER TABLE public.usage_quotas
ADD CONSTRAINT usage_quotas_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for api_usage
ALTER TABLE public.api_usage
ADD CONSTRAINT api_usage_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add FK constraint for error_logs (SET NULL variant)
ALTER TABLE public.error_logs
ADD CONSTRAINT error_logs_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add FK constraint for activity_logs
ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_organization_id_fk
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================================================
-- SUCCESS - All constraints added
-- ============================================================================
