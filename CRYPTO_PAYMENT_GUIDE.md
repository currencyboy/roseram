# Multi-Cryptocurrency Payment System Guide

## Overview

The system now supports 4 major cryptocurrencies for user account top-ups:

1. **Solana (SOL)** - Fastest, lowest fees
2. **Ethereum (ERC-20)** - Most widely trusted
3. **BNB Smart Chain (BNB)** - Fast and affordable
4. **Bitcoin (BTC)** - Most established cryptocurrency

## Payment Addresses

### Solana (SOL)
```
CbcWb97K3TEFJZJYLZRqdsMSdVXTFaMaUcF6yPQgY9yS
```
- **Network**: Mainnet-Beta
- **Speed**: ~10 seconds confirmation
- **Fees**: $0.00025 - $0.005
- **Min Amount**: 0.01 SOL

### Bitcoin (BTC)
```
15Z9UvjeLc5zQ1uhemyCeobvpz7Wg2UaYu
```
- **Network**: Bitcoin Mainnet
- **Speed**: ~10-60 minutes (1-6 confirmations)
- **Fees**: Variable (~$2-20 depending on network)
- **Min Amount**: 0.0001 BTC

### Ethereum (ERC-20)
```
0xc530cfc3a9a4e57cb35183ea1f5436aa1f8fc73c
```
- **Network**: Ethereum Mainnet
- **Speed**: ~12-30 seconds
- **Fees**: Variable (~$5-50 depending on gas)
- **Min Amount**: 0.001 ETH

### BNB Smart Chain
```
0xc530cfc3a9a4e57cb35183ea1f5436aa1f8fc73c
```
- **Network**: BSC Mainnet
- **Speed**: ~5-10 seconds
- **Fees**: Very low (~$0.10-1)
- **Min Amount**: 0.01 BNB

## Architecture

### Core Files

#### `lib/payment-methods.js`
Centralized configuration for all payment methods:
- Payment method metadata
- Exchange rates
- Wallet extensions
- Utility functions for conversions

**Key Functions:**
- `getPaymentMethods()` - Get all methods sorted by priority
- `getPaymentMethod(methodId)` - Get specific method
- `usdToCrypto(usd, methodId)` - Convert USD to crypto
- `cryptoToUsd(crypto, methodId)` - Convert crypto to USD
- `getExplorerLink(methodId, txHash)` - Get blockchain explorer link
- `isManualPayment(methodId)` - Check if manual transfer required

#### `components/CryptoPaymentWidget.jsx`
Multi-method payment UI component:
- Payment method selector
- USD/Crypto amount conversion
- Solana wallet integration (Solflare)
- Manual payment instructions
- Transaction confirmation display

**Features:**
- Real-time currency conversion
- Copy-to-clipboard for addresses
- Blockchain explorer links
- Success confirmation screens

#### `components/UsageInsightsModal.jsx` (Updated)
Billing modal now references multiple payment options:
- Shows supported cryptocurrencies
- Routes to CryptoPaymentWidget
- Displays balance information

## User Payment Flow

### Scenario 1: Solana Payment (Automated)
1. User clicks "Add Funds Now"
2. Modal opens CryptoPaymentWidget
3. Solana method selected by default
4. User enters amount (USD or SOL)
5. Clicks "Connect Solflare Wallet"
6. Wallet connects (user approves in extension)
7. Clicks "Pay X SOL"
8. Transaction sent to blockchain
9. Backend records payment
10. Balance updates automatically

### Scenario 2: Bitcoin Payment (Manual)
1. User clicks "Add Funds Now"
2. Modal opens CryptoPaymentWidget
3. User selects "Bitcoin"
4. Enters amount (converted to BTC)
5. Sees deposit address with "Copy" button
6. Opens their Bitcoin wallet
7. Sends exact amount to provided address
8. User confirms transaction
9. Backend monitors blockchain
10. Payment confirmed, balance updates

### Scenario 3: Ethereum/BNB Payment (Manual)
1. User clicks "Add Funds Now"
2. Modal opens CryptoPaymentWidget
3. User selects Ethereum or BNB
4. Enters amount
5. Sees deposit address
6. Opens MetaMask or wallet
7. Initiates transfer to address
8. Pays network gas fee
9. Transaction confirmed
10. Balance updates in app

## Configuration

### Adding a New Payment Method

1. **Update `lib/payment-methods.js`:**
```javascript
export const PAYMENT_METHODS = {
  // ... existing methods
  newchain: {
    name: 'New Chain',
    symbol: 'NCH',
    chain: 'New Chain',
    icon: 'newchain',
    address: '0x...your-address',
    explorerUrl: 'https://explorer.newchain.com/tx',
    walletExtension: 'New Wallet',
    walletUrl: 'https://newwallet.com',
    estimatedRate: 1000, // USD per NCH
    description: 'Fast payments on New Chain',
    minAmount: 0.01,
    priority: 5, // Lower number = higher priority
    manualTransfer: false, // or true
  },
};
```

2. **Create handler (if automated)**
If payment requires wallet integration, create a handler in `CryptoPaymentWidget.jsx`.

3. **Update UI**
Component automatically picks up new method from config.

### Changing Exchange Rates

Edit `estimatedRate` in `lib/payment-methods.js`:

```javascript
solana: {
  // ...
  estimatedRate: 200, // Change this value
},
```

**Note**: For production, fetch rates from price oracle:
```javascript
async function fetchLiveRate(methodId) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${methodId}&vs_currencies=usd`
  );
  return response.json();
}
```

### Changing Payment Addresses

⚠️ **IMPORTANT**: These addresses receive real cryptocurrency!

To update addresses:
1. Ensure you own/control the new address
2. Update `address` field in `lib/payment-methods.js`
3. Verify change in all payment flows
4. Test with small amounts first

**Current Addresses (VERIFIED):**
- Solana: `CbcWb97K3TEFJZJYLZRqdsMSdVXTFaMaUcF6yPQgY9yS`
- Bitcoin: `15Z9UvjeLc5zQ1uhemyCeobvpz7Wg2UaYu`
- Ethereum: `0xc530cfc3a9a4e57cb35183ea1f5436aa1f8fc73c`
- BNB SC: `0xc530cfc3a9a4e57cb35183ea1f5436aa1f8fc73c`

## Payment Processing

### Solana Payments
1. **Verification**: Check transaction signature on blockchain
2. **Recording**: Insert into `solana_payments` table
3. **Confirmation**: Status = 'confirmed'
4. **Balance**: Auto-calculated from `user_ai_usage`

**Endpoint**: `POST /api/payments/solana`

### Manual Payments (Bitcoin, Ethereum, BNB)
1. **Detection**: Monitor blockchain for transfers
2. **Verification**: Confirm amount and address
3. **Recording**: Insert into appropriate payments table
4. **Balance**: Update after verification

**Potential Implementation:**
- Blockchain webhooks (e.g., Alchemy)
- Scheduled jobs checking addresses
- User-initiated confirmation

## Database Integration

Payments are recorded in `solana_payments` table:
```sql
-- Current table works for all payment types
INSERT INTO solana_payments (
  user_id,
  transaction_signature,
  amount_sol,
  amount_usd,
  wallet_address,
  status,
  metadata
) VALUES (...)
```

**Enhancement Option:**
Create `crypto_payments` table for all methods:
```sql
CREATE TABLE crypto_payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  payment_method VARCHAR(50), -- 'solana', 'ethereum', 'bitcoin', 'bnb'
  transaction_hash VARCHAR(255) UNIQUE,
  amount_crypto DECIMAL(20, 9),
  amount_usd DECIMAL(10, 2),
  wallet_address VARCHAR(255),
  recipient_address VARCHAR(255),
  status VARCHAR(50), -- 'pending', 'confirmed', 'failed'
  network_confirmations INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);
```

## Testing

### Test Solana Payment
```javascript
// Simulate payment in browser console
const response = await fetch('/api/payments/solana', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user',
    transactionSignature: 'test_sig_abc123',
    amountSol: 0.1,
    walletAddress: 'test_wallet_123',
  })
});
console.log(await response.json());
```

### Test Manual Payment Detection
1. Send actual crypto to address
2. Verify transaction on blockchain explorer
3. Check if payment is recorded in database
4. Verify balance updates in app

### Test Conversion Functions
```javascript
import { usdToCrypto, cryptoToUsd } from '@/lib/payment-methods';

console.log(usdToCrypto(50, 'solana')); // 0.25 SOL
console.log(cryptoToUsd(0.25, 'solana')); // $50.00
```

## Security Best Practices

✅ **Implemented:**
- Addresses stored in code (verified)
- Blockchain verification for Solana
- Amount validation before recording
- User authentication check

⚠️ **To Implement:**
- Rate limiting on payment submissions
- Fraud detection (duplicate txs, etc.)
- Webhook verification for confirmations
- Encryption for stored addresses
- Audit logging for payment changes

🔒 **DO NOT:**
- Store private keys in code
- Expose addresses via frontend logs
- Skip blockchain verification
- Process payments without user auth
- Allow address changes without verification

## Monitoring & Alerts

### Recommended Monitoring
1. **Failed Payments**: Alert on 402 responses
2. **Pending Confirmations**: Track unconfirmed txs
3. **Exchange Rate Changes**: Alert on large swings
4. **Address Changes**: Log any payment address updates

### Blockchain Monitoring Services
- **Solana**: Alchemy, QuickNode, Helius
- **Ethereum/BSC**: Alchemy, Infura, Etherscan API
- **Bitcoin**: BlockCypher, Blockchain.com API

## Troubleshooting

### User Sees "Wallet Not Found"
**Cause**: Solflare extension not installed
**Solution**: Provide link to https://solflare.com

### Manual Payment Not Detected
**Cause**: Address not being monitored or confirmations insufficient
**Solution**: Implement blockchain monitoring webhook

### Wrong Exchange Rate
**Cause**: Manual rate outdated
**Solution**: Implement live rate fetching from CoinGecko

### Payment Widget Not Opening
**Cause**: Modal not mounted or CSS issue
**Solution**: Check console for errors, verify BillingProvider in layout

## Roadmap

- [ ] Live exchange rate fetching from CoinGecko API
- [ ] Blockchain event listeners for automatic payment detection
- [ ] Lightning Network for BTC (faster settlements)
- [ ] Stablecoin support (USDC, USDT)
- [ ] Recurring subscription payments
- [ ] Payment history export (CSV/PDF)
- [ ] Multi-signature wallet support
- [ ] Hardware wallet integration
- [ ] Payment refund management
