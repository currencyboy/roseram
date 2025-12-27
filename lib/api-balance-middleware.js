import { NextResponse } from 'next/server';
import { checkUserBalance } from '@/lib/billing-actions';

/**
 * Middleware to enforce balance check on API routes
 * Usage in API routes:
 * 
 * export async function POST(request) {
 *   const userId = await getUserIdFromRequest(request);
 *   const balanceCheck = await requireBalance(userId);
 *   
 *   if (!balanceCheck.allowed) {
 *     return NextResponse.json(balanceCheck.error, { status: balanceCheck.status });
 *   }
 *   
 *   // Continue with API logic...
 * }
 */
export async function requireBalance(userId) {
  if (!userId) {
    return {
      allowed: false,
      status: 401,
      error: { error: 'Authentication required' },
    };
  }

  try {
    const balanceCheck = await checkUserBalance(userId);

    if (!balanceCheck.allowed) {
      return {
        allowed: false,
        status: 402,
        error: {
          error: 'Payment required',
          message: 'Your balance is zero. Please add funds to continue using this service.',
          balance: balanceCheck.balance,
          nextAction: 'top-up',
        },
      };
    }

    return {
      allowed: true,
      balance: balanceCheck.balance,
      balanceInfo: balanceCheck,
    };
  } catch (error) {
    console.error('[API Balance Middleware] Error:', error);
    return {
      allowed: false,
      status: 500,
      error: { error: 'Internal server error', details: error.message },
    };
  }
}

/**
 * Extract user ID from request (from session, headers, or query params)
 */
export async function getUserIdFromRequest(request) {
  try {
    // Try to get from authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // Decode JWT if needed (simplified)
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.sub || payload.user_id || null;
      } catch {
        // Token parsing failed, continue to next method
      }
    }

    // Try to get from query params
    const url = new URL(request.url);
    const userIdFromQuery = url.searchParams.get('userId');
    if (userIdFromQuery) {
      return userIdFromQuery;
    }

    // Try to get from request body
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        const body = await request.json();
        return body.userId || body.user_id || null;
      } catch {
        // Body parsing failed
      }
    }

    return null;
  } catch (error) {
    console.error('[getUserIdFromRequest] Error:', error);
    return null;
  }
}

/**
 * Wrapper function that combines user ID extraction and balance check
 */
export async function checkBalanceFromRequest(request) {
  const userId = await getUserIdFromRequest(request);
  return requireBalance(userId);
}
