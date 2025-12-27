import { NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is no longer used in the streamlined workflow
 * Use /api/builder/smart-generate for multi-file code generation
 */
export async function POST(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/builder/smart-generate for multi-file generation',
      deprecated: true,
    },
    { status: 410 }
  );
}

export async function GET(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/builder/smart-generate for multi-file generation',
      deprecated: true,
    },
    { status: 410 }
  );
}
