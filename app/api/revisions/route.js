import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logger } from '@/lib/errors';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const filePath = searchParams.get('filePath');

    if (!projectId || !filePath) {
      return NextResponse.json(
        { error: 'Missing projectId or filePath' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseServer
      .from('file_revisions')
      .select('*')
      .eq('project_id', projectId)
      .eq('file_path', filePath)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching revisions', error);
      return NextResponse.json(
        { error: 'Failed to fetch revisions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      revisions: data || [],
    });
  } catch (error) {
    logger.error('Error in revisions GET', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { projectId, filePath, content, changeType, message } = body;

    if (!projectId || !filePath || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseServer
      .from('file_revisions')
      .insert([
        {
          project_id: projectId,
          file_path: filePath,
          content,
          change_type: changeType || 'edit',
          message: message || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      logger.error('Error creating revision', error);
      return NextResponse.json(
        { error: 'Failed to create revision', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      revision: data?.[0],
    });
  } catch (error) {
    logger.error('Error in revisions POST', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
