import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client to avoid errors during build time
// This function is called at runtime, not at module load time
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

const FREE_TIER_LIMIT = 25.00; // $25 free tier
const FREE_TIER_RATE = 1.00; // $1.00 per API call on free tier
const PAID_TIER_RATE = 0.50; // $0.50 per API call when user has paid

/**
 * Log an API usage event and calculate current balance
 */
export async function POST(request) {
  try {
    const { userId, operation, model, tokensUsed, cost, requestMetadata, responseMetadata } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Initialize Supabase client at runtime
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[Usage Tracking] Supabase not configured');
      return NextResponse.json(
        { error: 'Service unavailable - database not configured' },
        { status: 503 }
      );
    }

    // Check if user has made any payments to determine pricing tier
    const { data: payments, error: paymentError } = await supabase
      .from('solana_payments')
      .select('amount_usd')
      .eq('user_id', userId)
      .eq('status', 'confirmed');

    const totalPaid = payments?.reduce((sum, p) => sum + (p.amount_usd || 0), 0) || 0;
    const isOnPaidTier = totalPaid > 0;
    const baseRate = isOnPaidTier ? PAID_TIER_RATE : FREE_TIER_RATE;

    // Calculate total cost: base rate per API call + token-based cost
    const totalCost = baseRate + (cost || 0);

    // Log the API usage
    const { data: logData, error: logError } = await supabase
      .from('api_usage_logs')
      .insert([
        {
          user_id: userId,
          api_endpoint: operation,
          model: model || 'grok-4',
          operation: operation,
          tokens_used: tokensUsed || 0,
          cost: totalCost,
          request_metadata: requestMetadata || {},
          response_metadata: responseMetadata || {},
          status: 'success',
          created_by: userId,
        },
      ])
      .select('id, user_id, operation, model, tokens_used, cost, status, created_at')
      .single();

    if (logError) {
      console.error('[Usage Tracking] Error logging usage:', logError);
      return NextResponse.json(
        { error: 'Failed to log usage', details: logError.message },
        { status: 500 }
      );
    }

    // Get current balance
    const { data: usageData, error: usageError } = await supabase
      .from('user_ai_usage')
      .select('user_id, api_calls, tokens_consumed, cost_amount, period_start, period_end')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('[Usage Tracking] Error fetching usage:', usageError);
    }

    // Calculate balance
    const totalSpent = usageData?.cost_amount || 0;
    const freeUsed = Math.min(totalSpent, FREE_TIER_LIMIT);
    const paidUsed = totalSpent - freeUsed;
    const remainingFreeBalance = Math.max(0, FREE_TIER_LIMIT - freeUsed);
    const currentBalance = remainingFreeBalance + (totalPaid - paidUsed);

    return NextResponse.json({
      success: true,
      logId: logData.id,
      usage: {
        apiCalls: (usageData?.api_calls || 0) + 1,
        tokensConsumed: (usageData?.tokens_consumed || 0) + (tokensUsed || 0),
        totalCost: totalSpent + totalCost,
        freeUsed,
        paidUsed,
        currentBalance: Math.max(0, currentBalance),
        remainingFree: remainingFreeBalance,
        totalPaid,
      },
      lastCall: {
        operation,
        cost: totalCost,
        tokensUsed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Usage Tracking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get current usage and balance for a user
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Initialize Supabase client at runtime
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[Usage Tracking] Supabase not configured, returning default balance');
      return NextResponse.json({
        success: true,
        balance: {
          current: 25.00,
          remainingFree: 25.00,
          totalSpent: 0,
          totalPaid: 0,
          freeUsed: 0,
          paidUsed: 0,
        },
        usage: {
          apiCalls: 0,
          tokensConsumed: 0,
          period: { start: null, end: null },
        },
        insights: {
          operationBreakdown: {},
          recentCalls: [],
          payments: [],
          averageCostPerCall: 0,
        },
      });
    }

    // Get usage data
    const { data: usageData, error: usageError } = await supabase
      .from('user_ai_usage')
      .select('user_id, api_calls, tokens_consumed, cost_amount, period_start, period_end')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.warn('[Usage Tracking] Error fetching usage data:', usageError.message);
    }

    // Get all API logs for insights
    const { data: logs, error: logsError } = await supabase
      .from('api_usage_logs')
      .select('user_id, operation, model, tokens_used, cost, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      console.warn('[Usage Tracking] Error fetching logs:', logsError.message);
    }

    // Get total paid amount from Solana payments
    const { data: payments, error: paymentsError } = await supabase
      .from('solana_payments')
      .select('user_id, amount_usd, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.warn('[Usage Tracking] Error fetching payments:', paymentsError.message);
    }

    const totalPaid = payments?.reduce((sum, p) => sum + (p.amount_usd || 0), 0) || 0;
    const totalSpent = usageData?.cost_amount || 0;
    const freeUsed = Math.min(totalSpent, FREE_TIER_LIMIT);
    const paidUsed = totalSpent - freeUsed;
    const remainingFreeBalance = Math.max(0, FREE_TIER_LIMIT - freeUsed);
    const currentBalance = remainingFreeBalance + (totalPaid - paidUsed);

    // Get operation breakdown
    const operationBreakdown = {};
    logs?.forEach(log => {
      if (!operationBreakdown[log.operation]) {
        operationBreakdown[log.operation] = {
          count: 0,
          totalTokens: 0,
          totalCost: 0,
        };
      }
      operationBreakdown[log.operation].count += 1;
      operationBreakdown[log.operation].totalTokens += log.tokens_used || 0;
      operationBreakdown[log.operation].totalCost += log.cost || 0;
    });

    return NextResponse.json({
      success: true,
      balance: {
        current: Math.max(0, currentBalance),
        remainingFree: remainingFreeBalance,
        totalSpent,
        totalPaid,
        freeUsed,
        paidUsed,
      },
      usage: {
        apiCalls: usageData?.api_calls || 0,
        tokensConsumed: usageData?.tokens_consumed || 0,
        period: {
          start: usageData?.period_start,
          end: usageData?.period_end,
        },
      },
      insights: {
        operationBreakdown,
        recentCalls: logs?.slice(0, 10) || [],
        payments: payments || [],
        averageCostPerCall: logs?.length ? (totalSpent / logs.length).toFixed(4) : 0,
      },
    });
  } catch (error) {
    console.error('[Usage GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
