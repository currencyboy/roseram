import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const {
      serviceMetadata,
      supabaseUrl,
      supabaseKey,
    } = await request.json();

    if (!serviceMetadata || Object.keys(serviceMetadata).length === 0) {
      return NextResponse.json(
        { error: 'serviceMetadata is required' },
        { status: 400 }
      );
    }

    const duplicates = [];

    // If Supabase credentials provided, check for duplicates in their database
    if (supabaseUrl && supabaseKey) {
      const userSupabase = createClient(supabaseUrl, supabaseKey);

      // Search for existing users with same service IDs
      for (const [service, metadata] of Object.entries(serviceMetadata)) {
        const serviceId = metadata.id;
        if (!serviceId) continue;

        // Query for existing sessions with this service ID
        const { data: existingSessions, error } = await userSupabase
          .from('user_sessions')
          .select('user_id, service_metadata')
          .filter(
            'service_metadata',
            'cd',
            JSON.stringify({ [service]: { id: serviceId } })
          );

        if (error) {
          console.warn(`Error searching for duplicates for ${service}:`, error);
          continue;
        }

        if (existingSessions && existingSessions.length > 0) {
          existingSessions.forEach(session => {
            duplicates.push({
              existingUserId: session.user_id,
              service,
              serviceId,
              detectionMethod: 'service_id_match',
            });
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates,
    });
  } catch (error) {
    console.error('Duplicate detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect duplicates', details: error.message },
      { status: 500 }
    );
  }
}
