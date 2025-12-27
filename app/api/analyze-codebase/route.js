import { NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is no longer used in the streamlined workflow
 * Use /api/repository or /api/file-snapshots for codebase analysis
 */
export async function POST(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/repository or /api/file-snapshots instead',
      deprecated: true,
    },
    { status: 410 } // 410 Gone - resource is permanently unavailable
  );
}

export async function GET(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/repository or /api/file-snapshots instead',
      deprecated: true,
    },
    { status: 410 }
  );
}
