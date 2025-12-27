import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const {
      userId,
      userData,
      serviceMetadata,
      credentials,
      formInputs,
      projectConfigs,
      integrationSettings,
      supabaseUrl,
      supabaseKey,
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // If Supabase credentials provided, sync to their database
    if (supabaseUrl && supabaseKey) {
      const userSupabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await userSupabase
        .from('user_sessions')
        .upsert({
          user_id: userId,
          user_data: userData || null,
          service_metadata: serviceMetadata || null,
          credentials: credentials ? Buffer.from(credentials).toString('base64') : null,
          form_inputs: formInputs || null,
          project_configs: projectConfigs || null,
          integration_settings: integrationSettings || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Supabase sync error:', error);
        return NextResponse.json(
          { error: 'Failed to sync to Supabase', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        synced: true,
        message: 'Session synced to Supabase',
      });
    }

    return NextResponse.json({
      success: true,
      synced: false,
      message: 'Session data received but not synced (no Supabase credentials)',
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync session', details: error.message },
      { status: 500 }
    );
  }
}
