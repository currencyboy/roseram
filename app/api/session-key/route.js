import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { action, sessionId, userXApiKey } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (action === 'set') {
      if (!userXApiKey) {
        return NextResponse.json(
          { error: 'API key is required' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          id: sessionId,
          x_api_key_hash: hashApiKey(userXApiKey),
          x_api_key_encrypted: encryptApiKey(userXApiKey),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to save API key:', error);
        return NextResponse.json(
          { error: 'Failed to save API key' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'API key saved to session',
      });
    }

    if (action === 'get') {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('x_api_key_encrypted')
        .eq('id', sessionId)
        .single();

      if (error || !data?.x_api_key_encrypted) {
        return NextResponse.json(
          { apiKey: null },
          { status: 200 }
        );
      }

      return NextResponse.json({
        apiKey: decryptApiKey(data.x_api_key_encrypted),
      });
    }

    if (action === 'clear') {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          x_api_key_encrypted: null,
          x_api_key_hash: null,
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Failed to clear API key:', error);
        return NextResponse.json(
          { error: 'Failed to clear API key' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'API key cleared from session',
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Session key route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function hashApiKey(key) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

function encryptApiKey(key) {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE;
  if (!secret) {
    console.warn('No encryption secret available, storing plaintext (NOT RECOMMENDED)');
    return Buffer.from(key).toString('base64');
  }

  const crypto = require('crypto');
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptApiKey(encrypted) {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE;
  if (!secret) {
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }

  try {
    const crypto = require('crypto');
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}
