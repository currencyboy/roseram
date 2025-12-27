import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          sprites_token: !!process.env.SPRITES_TOKEN,
          supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
        },
        { status: 500 }
      );
    }

    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { data, error } = await supabaseServer.auth.getUser(token);

    if (error || !data?.user) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          auth_error: error?.message,
        },
        { status: 401 }
      );
    }

    // Get user's preview instances
    const { data: previews, error: queryError } = await supabaseServer
      .from('auto_preview_instances')
      .select('*')
      .eq('user_id', data.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError) {
      return NextResponse.json(
        {
          error: 'Database query failed',
          db_error: queryError.message,
          user_id: data.user.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      sprites_configured: !!process.env.SPRITES_TOKEN,
      recent_previews: previews.map(p => ({
        id: p.id,
        sprite_name: p.sprite_name,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        error: p.error_message,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Debug endpoint error',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
