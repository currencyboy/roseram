import { NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is no longer used in the streamlined workflow
 * Use /api/grok-generate or /api/builder/smart-generate instead
 */
export async function POST(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/grok-generate or /api/builder/smart-generate instead',
      deprecated: true,
    },
    { status: 410 }
  );
}

export async function GET(request) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Use /api/grok-generate or /api/builder/smart-generate instead',
      deprecated: true,
    },
    { status: 410 }
  );
}
