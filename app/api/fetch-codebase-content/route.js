import { NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is no longer used in the streamlined workflow
 * Use /api/repository with action=getFiles for codebase content
 */
export async function POST(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/repository with action=getFiles instead',
      deprecated: true,
    },
    { status: 410 }
  );
}

export async function GET(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/repository with action=getFiles instead',
      deprecated: true,
    },
    { status: 410 }
  );
}
