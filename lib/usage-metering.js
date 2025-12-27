// Usage Metering System
// Tracks X.AI/Grok API usage and calculates costs
// Free tier: $2.50, then charged at 10x the actual API cost

const FREE_TIER_CREDITS = 2.50; // $2.50 free credits
const COST_MULTIPLIER = 10; // Charge users at 10x actual cost

// X.AI/Grok pricing (approximate costs per request)
const PRICING = {
  'grok-beta': 0.00005, // $0.00005 per token (input + output)
  'grok-2-latest': 0.00008,
  'grok-3': 0.0001,
};

export async function trackUsage(userId, model = 'grok-beta', inputTokens = 0, outputTokens = 0) {
  try {
    const totalTokens = inputTokens + outputTokens;
    const costPerToken = PRICING[model] || PRICING['grok-beta'];
    const actualCost = totalTokens * costPerToken;
    const chargedCost = actualCost * COST_MULTIPLIER;

    // Store usage in database (would use Supabase in production)
    const usage = {
      userId,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      actualCost,
      chargedCost,
      timestamp: new Date().toISOString(),
    };

    // Log usage (would be stored in database)
    console.log('[Usage Tracking]', usage);

    return {
      success: true,
      actualCost,
      chargedCost,
      usage,
    };
  } catch (error) {
    console.error('Usage tracking error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track usage',
    };
  }
}

export async function getUserCredits(userId) {
  try {
    // This would query the database in production
    // For now, return a mock response
    return {
      freeCredits: FREE_TIER_CREDITS,
      usedCredits: 0,
      remainingCredits: FREE_TIER_CREDITS,
      totalCreditsUsed: 0,
    };
  } catch (error) {
    console.error('Get credits error:', error);
    return null;
  }
}

export async function deductCredits(userId, amount) {
  try {
    // Would update database in production
    const credits = await getUserCredits(userId);
    if (!credits) throw new Error('Could not fetch credits');

    const newRemaining = credits.remainingCredits - amount;

    return {
      success: true,
      remaining: Math.max(0, newRemaining),
      deducted: amount,
      needsPayment: newRemaining < 0,
    };
  } catch (error) {
    console.error('Deduct credits error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deduct credits',
    };
  }
}

export function calculateCost(inputTokens, outputTokens, model = 'grok-beta') {
  const costPerToken = PRICING[model] || PRICING['grok-beta'];
  const actualCost = (inputTokens + outputTokens) * costPerToken;
  return {
    actualCost,
    chargedCost: actualCost * COST_MULTIPLIER,
    costPerToken,
  };
}
