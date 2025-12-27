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

    // Get integrations (credentials are encrypted)
    const { data, error: intError } = await supabase
      .from('integrations')
      .select('id, provider, is_active, metadata, last_used_at, created_at')
      .eq('organization_id', organizationId);

    if (intError) {
      throw intError;
    }

    return NextResponse.json({
      success: true,
      integrations: data || [],
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error fetching integrations', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
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
      organizationId,
      provider,
      credentials,
      is_active = true,
    } = body;

    if (!organizationId || !provider || !credentials) {
      throw new ValidationError('organizationId, provider, and credentials are required');
    }

    // Validate provider
    const validProviders = [
      'stripe',
      'netlify',
      'vercel',
      'github',
      'sentry',
      'builder-cms',
      'notion',
      'zapier',
    ];

    if (!validProviders.includes(provider)) {
      throw new ValidationError(`Invalid provider: ${provider}`);
    }

    // Check user organization access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only admin users can manage integrations' },
        { status: 403 }
      );
    }

    // Encrypt credentials (in production, use a proper encryption service)
    const credentialsStr = JSON.stringify(credentials);
    const credentialsEncrypted = Buffer.from(credentialsStr).toString('base64');

    // Upsert integration
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .upsert({
        organization_id: organizationId,
        provider,
        credentials_encrypted: credentialsEncrypted,
        is_active,
        metadata: {
          last_configured: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,provider',
      })
      .select()
      .single();

    if (intError) {
      throw intError;
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id,
      user_id: user.id,
      action: `integration_${provider}_configured`,
      resource_type: 'integration',
      resource_id: integration.id,
    });

    logger.info('Integration configured', {
      organizationId,
      provider,
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        is_active: integration.is_active,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error configuring integration', error);
    return NextResponse.json(
      { error: 'Failed to configure integration' },
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
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      throw new ValidationError('integrationId parameter is required');
    }

    // Get integration and check access
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*, organizations!inner(id)')
      .eq('id', integrationId)
      .single();

    if (intError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Check user access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', integration.organizations[0].id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only admin users can manage integrations' },
        { status: 403 }
      );
    }

    // Delete integration
    const { error: deleteError } = await supabase
      .from('integrations')
      .delete()
      .eq('id', integrationId);

    if (deleteError) {
      throw deleteError;
    }

    logger.info('Integration deleted', { integrationId });

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    logger.error('Error deleting integration', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
