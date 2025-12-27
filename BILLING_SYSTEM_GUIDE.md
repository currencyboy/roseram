# Billing & Usage Tracking System Guide

## Overview

This document describes the complete billing system implementation, including:
- **Free tier tracking** ($25 one-time per user)
- **Paid credits** via Solana/crypto payments
- **API balance enforcement** (blocks calls when balance is $0)
- **Auto-opening modal** when balance reaches zero
- **Usage analytics** with detailed breakdowns

## Architecture

### Database Schema

Three main tables handle all billing operations:

1. **`user_ai_usage`** - Daily/periodic aggregated usage per user
   - Tracks API calls, tokens consumed, costs
   - Stores free tier and paid usage separately
   - Auto-updated by trigger on each API call

2. **`api_usage_logs`** - Detailed per-request logs
   - Complete log of every API call
   - Stores tokens used, cost, status, metadata
   - Used for analytics and usage breakdown

3. **`solana_payments`** - Crypto payment records
   - Records all Solana transactions
   - Tracks amount in SOL and USD equivalent
   - Status: 'confirmed', 'pending', etc.

### Components & Files

#### Core Utilities
- **`lib/billing.js`** - Main billing logic
  - `checkUserBalance()` - Get current balance
  - `getUserBillingInfo()` - Full billing information
  - `hasUsedFreeTier()` - Check free tier status
  - `requireBalance()` - Legacy middleware function

- **`lib/api-balance-middleware.js`** - API route protection
  - `requireBalance(userId)` - Check balance and return 402 if needed
  - `getUserIdFromRequest(request)` - Extract user ID from request
  - `checkBalanceFromRequest(request)` - Combined function

- **`lib/useBillingModal.js`** - React hook for billing modal
  - `useBillingModal()` - Check balance from components

#### React Components
- **`components/BillingProvider.jsx`** - Global billing state
  - Context provider for app-wide billing state
  - Auto-refreshes balance every 30 seconds
  - Auto-opens modal when balance hits $0
  - Exposes `useBilling()` hook

- **`components/UsageInsightsModal.jsx`** - Billing UI
  - Displays current balance, free tier, paid credits
  - Shows usage by operation type
  - Shows recent API calls history
  - Integrates payment widget
  - Auto-opens on zero balance with prominent alert

- **`components/SolanaPaymentWidget.jsx`** - Payment interface
  - Solana wallet connection
  - USD/SOL conversion
  - Transaction submission
  - Success confirmation

#### Modified API Endpoints
- **`app/api/generate/route.js`** - Balance check added
- **`app/api/generate-advanced/route.js`** - Balance check added
- **`app/api/generate-multi-file/route.js`** - Balance check added
- **`app/api/usage/track/route.js`** - Existing tracking endpoint
- **`app/api/payments/solana/route.js`** - Payment processing

#### Updated Files
- **`app/layout.jsx`** - Added BillingProvider wrapper and modal

## How It Works

### 1. Balance Calculation

Balance is calculated as:
```
Current Balance = Remaining Free Tier + (Total Paid - Paid Used)
Remaining Free Tier = max(0, $25 - Free Used)
```

Example:
- User has $25 free tier (default)
- User has spent $10 so far → $15 free remaining
- User paid $50 via Solana → $50 added
- User spent $30 of paid amount → $20 paid remaining
- **Total Balance = $15 + $20 = $35**

### 2. Free Tier

- **One-time only**: Each user gets $25 free tier once
- **Not reset**: Does not reset monthly or daily
- **Tracked separately**: `free_tier_used` in `user_ai_usage`
- **Enforced**: Once exhausted, user must pay

### 3. API Call Blocking

When balance reaches $0:
1. ✅ **Trigger**: Next API call checks balance
2. ✅ **Block**: Request returns `402 Payment Required`
3. ✅ **Modal**: UsageInsightsModal auto-opens
4. ✅ **Action**: User sees prominent "Add Funds" alert
5. ✅ **Unlock**: After Solana payment succeeds, balance refreshes

### 4. Usage Tracking Flow

```
User calls /api/generate
  ↓
Balance middleware checks user balance
  ↓
If balance = 0:
  └─→ Return 402 Payment Required
  └─→ Frontend auto-opens billing modal
  └─→ User can't proceed without payment
  ↓
If balance > 0:
  └─→ Process API request normally
  └─→ API call is logged to api_usage_logs
  └─→ Trigger updates user_ai_usage
  └─→ Balance automatically recalculates
```

### 5. Payment Flow

```
User clicks "Top Up Balance"
  ↓
SolanaPaymentWidget opens
  ↓
User connects wallet
  ↓
User enters amount (USD or SOL)
  ↓
User confirms payment
  ↓
Transaction sent to blockchain
  ↓
Backend records in solana_payments
  ↓
BillingProvider refreshes balance
  ↓
Modal auto-closes
  ↓
User can make API calls again
```

## Adding Balance Check to New Endpoints

To add balance checking to any new API endpoint:

### Step 1: Import the middleware
```javascript
import { checkBalanceFromRequest } from '@/lib/api-balance-middleware';
```

### Step 2: Add balance check at start of POST handler
```javascript
export async function POST(request) {
  // Check user balance FIRST, before any other logic
  const balanceCheck = await checkBalanceFromRequest(request);
  if (!balanceCheck.allowed) {
    return NextResponse.json(balanceCheck.error, { status: balanceCheck.status });
  }

  // Rest of your API logic...
  try {
    // ... handle request ...
  } catch (error) {
    // ... handle errors ...
  }
}
```

### Step 3: Ensure userId is in request

The middleware extracts userId from:
1. Authorization header (Bearer token)
2. Query params (`?userId=...`)
3. Request body (`{ userId: ... }` or `{ user_id: ... }`)

Example with userId in query:
```javascript
// This will be extracted automatically
GET /api/my-endpoint?userId=user-123
```

Example with userId in body:
```javascript
POST /api/my-endpoint
{ "userId": "user-123", "prompt": "..." }
```

## Testing the System

### Test Balance Check
```bash
# Should fail with 402
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "userId": "test-user-id"}'
```

### Test with Valid Session
1. Login to app
2. Navigate to any page
3. Try calling an API (generate, etc.)
4. If balance is $0, modal auto-opens

### Add Test Data
```sql
-- Add $50 credit via Solana
INSERT INTO solana_payments (user_id, amount_usd, amount_sol, status, ...)
VALUES ('user-id', 50.00, 0.25, 'confirmed', ...);
```

## Configuration

### Free Tier Limit
Edit `FREE_TIER_LIMIT` in:
- `lib/billing.js` (line 7)
- `app/api/usage/track/route.js` (line 8)
- Components use same value

### SOL/USD Rate
Edit `SOL_USD_RATE` in:
- `app/api/payments/solana/route.js` (line 12)
- Updates in real-time from SolanaPaymentWidget

### Refresh Interval
Edit balance refresh interval in `BillingProvider.jsx`:
```javascript
// Currently: 30000ms (30 seconds)
const interval = setInterval(() => {
  refreshBalance();
}, 30000); // Change this value
```

## Error Messages

### 402 Payment Required
```json
{
  "error": "Payment required",
  "message": "Your balance is zero. Please add funds to continue using this service.",
  "balance": 0,
  "nextAction": "top-up"
}
```

### 401 Authentication Required
```json
{
  "error": "Authentication required"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "details": "error message"
}
```

## Monitoring & Analytics

View usage analytics in the modal:

1. **Overview Tab**
   - Current balance
   - Free tier progress
   - Paid credits used
   - Total API calls, tokens, spending

2. **Operations Tab**
   - Breakdown by API operation
   - Cost per operation
   - Call counts
   - Average cost

3. **History Tab**
   - Last 10 API calls
   - Timestamp, cost, tokens used
   - Operation name

## Security Considerations

### ✅ Implemented
- Service role Supabase client (read-only for balance checks)
- Balance check before API execution
- Secure Solana transaction verification
- No balance info leaked in client logs

### ⚠️ Important
- Never expose API_KEY or SERVICE_ROLE in frontend
- Always verify balance server-side before processing
- Solana payment verification should confirm real blockchain

### 🔒 Future Hardening
- Rate limiting on API calls
- Fraud detection for payment patterns
- Webhook verification for Solana confirmations
- PCI compliance for payment flow

## Troubleshooting

### Modal Won't Open on $0 Balance
1. Check `BillingProvider` is in layout
2. Check session is authenticated
3. Check browser console for errors
4. Verify balance query returns 0

### Balance Not Updating After Payment
1. Check `handlePaymentSuccess()` was called
2. Verify Solana transaction was confirmed
3. Check `solana_payments` table for record
4. Try manual refresh (page reload)

### API Calls Not Blocked
1. Check middleware import is correct
2. Check balance check is FIRST in handler
3. Check userId extraction works
4. Look for console errors

### 402 Response Not Triggering Modal
1. Check frontend handles 402 status code
2. Check error response format matches expected
3. Add logging to component to debug flow

## API Reference

### GET /api/usage/track?userId={id}
Returns detailed billing information.

**Response:**
```json
{
  "success": true,
  "balance": {
    "current": 35.50,
    "remainingFree": 15.00,
    "totalSpent": 10.00,
    "totalPaid": 50.00,
    "freeUsed": 10.00,
    "paidUsed": 30.00
  },
  "usage": {
    "apiCalls": 42,
    "tokensConsumed": 125000,
    "period": {...}
  },
  "insights": {
    "operationBreakdown": {...},
    "recentCalls": [...],
    "payments": [...]
  }
}
```

### POST /api/payments/solana
Records a payment transaction.

**Request:**
```json
{
  "userId": "user-id",
  "transactionSignature": "tx-sig-...",
  "amountSol": 0.25,
  "walletAddress": "wallet-address"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-id",
    "amountSol": 0.25,
    "amountUsd": 50.00,
    "status": "confirmed"
  }
}
```

## Examples

### Example 1: User Reaches $0, Pays with Solana

1. User has spent $25 free + paid $25 = $50 total
2. User makes API call → Balance is $0
3. Endpoint returns 402 → Frontend opens modal
4. Modal shows "Balance is zero" alert
5. User enters $50 in Solana amount
6. Payment succeeds
7. Balance updates to $50
8. Modal closes
9. User can make API calls again

### Example 2: User with Active Paid Plan

1. User has $25 free (used $10) and $100 paid (used $30)
2. Current balance = $15 + $70 = $85
3. User makes API call costing $5
4. Balance updates to $80
5. User continues normally
6. No blocking or modal opens

## Future Enhancements

- [ ] Monthly subscription plans
- [ ] Usage limits per tier
- [ ] Email alerts at low balance
- [ ] Multiple payment methods (Stripe, etc.)
- [ ] Refund management
- [ ] Usage quotas (API calls per month)
- [ ] Priority queue based on payment tier
- [ ] Bulk pricing discounts
