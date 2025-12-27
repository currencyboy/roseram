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
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      throw new ValidationError('siteId parameter is required');
    }

    // Verify user has access to this site
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id, organization_id')
      .eq('id', siteId)
      .single();

    if (siteError || !siteData) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Check user organization access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', siteData.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get pages
    const { data: pagesData, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('site_id', siteId)
      .order('updated_at', { ascending: false });

    if (pagesError) {
      throw pagesError;
    }

    return NextResponse.json({
      success: true,
      pages: pagesData || [],
      count: pagesData?.length || 0,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error fetching pages', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
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

    const body = await request.json();
    const {
      siteId,
      name,
      slug,
      title = name,
      description = '',
      layoutType = 'default',
    } = body;

    // Validate input
    if (!siteId || !name || !slug) {
      throw new ValidationError('siteId, name, and slug are required');
    }

    if (slug.length < 1 || slug.length > 255) {
      throw new ValidationError('Slug must be between 1 and 255 characters');
    }

    // Verify slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ValidationError('Slug must be lowercase with hyphens only');
    }

    // Verify user has access to this site
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id, organization_id')
      .eq('id', siteId)
      .single();

    if (siteError || !siteData) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Check user organization access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', siteData.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create page
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .insert({
        site_id: siteId,
        name,
        slug,
        title,
        description,
        layout_type: layoutType,
        content: { blocks: [] },
        status: 'draft',
      })
      .select()
      .single();

    if (pageError) {
      if (pageError.code === '23505') {
        return NextResponse.json(
          { error: 'Page with this slug already exists in this site' },
          { status: 409 }
        );
      }
      throw pageError;
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: siteData.organization_id,
      user_id: user.id,
      action: 'page_created',
      resource_type: 'page',
      resource_id: pageData.id,
    });

    logger.info('Page created', { pageId: pageData.id, siteId });

    return NextResponse.json({
      success: true,
      page: pageData,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error creating page', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, ...updates } = body;

    if (!pageId) {
      throw new ValidationError('pageId is required');
    }

    // Get page and verify access
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .select('*, sites!inner(organization_id)')
      .eq('id', pageId)
      .single();

    if (pageError || !pageData) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Check user access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', pageData.sites.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update page
    const { data: updatedPageData, error: updateError } = await supabase
      .from('pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    logger.info('Page updated', { pageId });

    return NextResponse.json({
      success: true,
      page: updatedPageData,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error updating page', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      throw new ValidationError('pageId parameter is required');
    }

    // Get page and verify access
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .select('*, sites!inner(organization_id)')
      .eq('id', pageId)
      .single();

    if (pageError || !pageData) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Check user access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', pageData.sites.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete page
    const { error: deleteError } = await supabase
      .from('pages')
      .delete()
      .eq('id', pageId);

    if (deleteError) {
      throw deleteError;
    }

    logger.info('Page deleted', { pageId });

    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error deleting page', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
