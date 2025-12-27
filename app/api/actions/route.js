import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      // Database not configured - return empty list
      return NextResponse.json({
        success: true,
        actions: [],
        note: 'Database not configured',
      });
    }

    try {
      const { data, error } = await supabaseServer
        .from('action_logs')
        .select('id, project_id, action, file_path, description, metadata, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        // If table doesn't exist, return empty list instead of error
        console.error('Error fetching actions:', error);
        return NextResponse.json({
          success: true,
          actions: [],
          note: 'Action logs unavailable',
        });
      }

      return NextResponse.json({
        success: true,
        actions: data || [],
      });
    } catch (dbError) {
      // Database error - return empty list as fallback
      console.error('Error in actions GET:', dbError);
      return NextResponse.json({
        success: true,
        actions: [],
        note: 'Action logs unavailable',
      });
    }
  } catch (error) {
    logger.error('Error in actions GET', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { projectId, action, filePath, description, metadata } = body;

    if (!projectId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      // Database not configured - log to console instead
      console.log('[Action Log]', { projectId, action, filePath, description });
      return NextResponse.json({
        success: true,
        action: null,
        note: 'Action logged to console (database not configured)',
      });
    }

    try {
      const { data, error } = await supabaseServer
        .from('action_logs')
        .insert([
          {
            project_id: projectId,
            action,
            file_path: filePath || null,
            description: description || null,
            metadata: metadata || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        // If table doesn't exist or column is missing, log to console instead
        console.log('[Action Log]', { projectId, action, filePath, description });
        return NextResponse.json({
          success: true,
          action: null,
          note: 'Action logged to console (database table unavailable)',
        });
      }

      return NextResponse.json({
        success: true,
        action: data?.[0],
      });
    } catch (dbError) {
      // Database error - log to console as fallback
      console.log('[Action Log]', { projectId, action, filePath, description });
      console.error('[Action Log Error]', dbError);
      return NextResponse.json({
        success: true,
        action: null,
        note: 'Action logged to console (database error)',
      });
    }
  } catch (error) {
    logger.error('Error in actions POST', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
