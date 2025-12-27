import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const {
      userId,
      supabaseUrl,
      supabaseKey,
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // If Supabase credentials provided, retrieve from their database
    if (supabaseUrl && supabaseKey) {
      const userSupabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await userSupabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Supabase retrieval error:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve session from Supabase', details: error.message },
          { status: 500 }
        );
      }

      if (data) {
        return NextResponse.json({
          success: true,
          session: {
            userId: data.user_id,
            userData: data.user_data,
            serviceMetadata: data.service_metadata,
            credentials: data.credentials ? Buffer.from(data.credentials, 'base64').toString() : null,
            formInputs: data.form_inputs,
            projectConfigs: data.project_configs,
            integrationSettings: data.integration_settings,
            lastUpdated: data.updated_at,
          },
        });
      }

      return NextResponse.json({
        success: true,
        session: null,
        message: 'No session found for this user',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Supabase credentials required to retrieve session',
    }, { status: 400 });
  } catch (error) {
    console.error('Retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session', details: error.message },
      { status: 500 }
    );
  }
}
