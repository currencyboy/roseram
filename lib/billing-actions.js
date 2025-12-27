'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Billing] Missing Supabase configuration');
}

// Lazy initialize Supabase client - only create if config is available
let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
}

const FREE_TIER_LIMIT = 25.00;

/**
 * Check if user has sufficient balance for API call
 * Returns { allowed: boolean, balance: number, message?: string }
 */
export async function checkUserBalance(userId) {
  try {
    if (!userId) {
      return { allowed: false, balance: 0, message: 'User ID is required' };
    }

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Billing] Supabase not configured, returning default balance');
      return {
        allowed: true,
        balance: FREE_TIER_LIMIT,
        remainingFree: FREE_TIER_LIMIT,
        totalPaid: 0,
        totalSpent: 0,
        freeUsed: 0,
        paidUsed: 0,
      };
    }

    // Get current usage
    const { data: usageData, error: usageError } = await supabase
      .from('user_ai_usage')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.warn('[Billing] Error fetching usage:', usageError.message);
      // Return default balance instead of failing
      return {
        allowed: true,
        balance: FREE_TIER_LIMIT,
        remainingFree: FREE_TIER_LIMIT,
        totalPaid: 0,
        totalSpent: 0,
        freeUsed: 0,
        paidUsed: 0,
      };
    }

    // Get total paid amount from Solana payments
    const { data: payments, error: paymentError } = await supabase
      .from('solana_payments')
      .select('amount_usd')
      .eq('user_id', userId)
      .eq('status', 'confirmed');

    if (paymentError) {
      console.warn('[Billing] Error fetching payments:', paymentError.message);
      // Return default balance instead of failing
      return {
        allowed: true,
        balance: FREE_TIER_LIMIT,
        remainingFree: FREE_TIER_LIMIT,
        totalPaid: 0,
        totalSpent: 0,
        freeUsed: 0,
        paidUsed: 0,
      };
    }

    const totalPaid = payments?.reduce((sum, p) => sum + (p.amount_usd || 0), 0) || 0;
    const totalSpent = usageData?.cost_amount || 0;
    const freeUsed = Math.min(totalSpent, FREE_TIER_LIMIT);
    const paidUsed = totalSpent - freeUsed;
    const remainingFreeBalance = Math.max(0, FREE_TIER_LIMIT - freeUsed);
    const currentBalance = remainingFreeBalance + (totalPaid - paidUsed);

    return {
      allowed: currentBalance > 0,
      balance: Math.max(0, currentBalance),
      remainingFree: remainingFreeBalance,
      totalPaid,
      totalSpent,
      freeUsed,
      paidUsed,
    };
  } catch (error) {
    console.error('[Billing] Unexpected error:', error);
    return { allowed: false, balance: 0, message: 'Billing service error' };
  }
}

/**
 * Get detailed billing information for a user
 */
export async function getUserBillingInfo(userId) {
  try {
    if (!userId) {
      return null;
    }

    const { data: usageData, error: usageError } = await supabase
      .from('user_ai_usage')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      throw usageError;
    }

    const { data: payments, error: paymentError } = await supabase
      .from('solana_payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (paymentError) {
      throw paymentError;
    }

    const totalPaid = payments?.reduce((sum, p) => sum + (p.amount_usd || 0), 0) || 0;
    const totalSpent = usageData?.cost_amount || 0;
    const freeUsed = Math.min(totalSpent, FREE_TIER_LIMIT);
    const paidUsed = totalSpent - freeUsed;
    const remainingFreeBalance = Math.max(0, FREE_TIER_LIMIT - freeUsed);
    const currentBalance = remainingFreeBalance + (totalPaid - paidUsed);

    return {
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
      payments: payments || [],
      freeTierLimit: FREE_TIER_LIMIT,
    };
  } catch (error) {
    console.error('[Billing] Error getting billing info:', error);
    throw error;
  }
}

/**
 * Check if user has used their free tier
 */
export async function hasUsedFreeTier(userId) {
  try {
    if (!userId) {
      return false;
    }

    const { data: usageData, error } = await supabase
      .from('user_ai_usage')
      .select('free_tier_used')
      .eq('user_id', userId)
      .gt('free_tier_used', 0)
      .limit(1);

    if (error) {
      console.error('[Billing] Error checking free tier:', error);
      return false;
    }

    return usageData && usageData.length > 0;
  } catch (error) {
    console.error('[Billing] Error:', error);
    return false;
  }
}

/**
 * Middleware to check balance before API call
 * Add this to API routes that require billing
 */
export async function requireBalance(request, userId) {
  const balanceCheck = await checkUserBalance(userId);

  if (!balanceCheck.allowed) {
    return {
      allowed: false,
      status: 402,
      error: 'Payment required: Balance is zero. Please add funds to continue.',
    };
  }

  return { allowed: true };
}
