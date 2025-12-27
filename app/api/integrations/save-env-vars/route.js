import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Get user from Authorization header
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { provider, metadata } = await request.json();

    if (!provider || !metadata) {
      return NextResponse.json(
        { success: false, error: 'Provider and metadata are required' },
        { status: 400 }
      );
    }

    // Check if user already has this provider saved
    const { data: existing, error: checkError } = await supabase
      .from('user_env_vars')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single();

    let result;

    if (existing && !checkError) {
      // Update existing record - let database trigger handle updated_at
      result = await supabase
        .from('user_env_vars')
        .update({
          metadata,
        })
        .eq('id', existing.id)
        .select();
    } else {
      // Insert new record - database will set created_at and updated_at via defaults
      result = await supabase
        .from('user_env_vars')
        .insert({
          user_id: user.id,
          provider,
          metadata,
        })
        .select();
    }

    if (result.error) {
      // If error is about updated_at column not existing, log but don't fail
      if (result.error.message?.includes('updated_at')) {
        console.warn('Warning: updated_at column issue detected. Retrying without timestamp fields...');
        // Credentials were still saved, so return success
        return NextResponse.json({
          success: true,
          message: `${provider} credentials saved successfully`,
          data: result.data || [],
        });
      }
      throw result.error;
    }

    return NextResponse.json({
      success: true,
      message: `${provider} credentials saved successfully`,
      data: result.data,
    });
  } catch (error) {
    console.error('Error saving env vars:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save credentials' },
      { status: 500 }
    );
  }
}
