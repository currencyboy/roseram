import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logger, ValidationError } from '@/lib/errors';

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      throw new ValidationError('organizationId parameter is required');
    }

    // Check user organization access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get sites with stats
    const { data, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        pages!inner(id, status),
        deployments!inner(id, status)
      `)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (sitesError) {
      throw sitesError;
    }

    return NextResponse.json({
      success,
      sites: sites || [],
      count: sites?.length || 0,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error fetching sites', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body= await request.json();
    const {
      organizationId,
      name,
      slug,
      description = '',
    } = body;

    // Validate input
    if (!organizationId || !name || !slug) {
      throw new ValidationError('organizationId, name, and slug are required');
    }

    if (slug.length < 1 || slug.length > 255) {
      throw new ValidationError('Slug must be between 1 and 255 characters');
    }

    // Verify slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ValidationError('Slug must be lowercase with hyphens only');
    }

    // Check user organization access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create site
    const { data, error: siteError } = await supabase
      .from('sites')
      .insert({
        organization_id,
        name,
        slug,
        description,
        status: 'draft',
      })
      .select()
      .single();

    if (siteError) {
      if (siteError.code === '23505') {
        return NextResponse.json(
          { error: 'Site with this slug already exists in this organization' },
          { status: 409 }
        );
      }
      throw siteError;
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id,
      user_id: user.id,
      action: 'site_created',
      resource_type: 'site',
      resource_id: site.id,
    });

    logger.info('Site created', { siteId: site.id, organizationId });

    return NextResponse.json({
      success,
      site,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error creating site', error);
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 }
    );
  }
}
