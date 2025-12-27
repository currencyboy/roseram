/**
 * Supported payment methods and their configuration
 * This centralized config makes it easy to update addresses or add new methods
 */

export const PAYMENT_METHODS = {
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    chain: 'Solana',
    icon: 'solana',
    address: 'CbcWb97K3TEFJZJYLZRqdsMSdVXTFaMaUcF6yPQgY9yS',
    explorerUrl: 'https://solscan.io/tx',
    walletExtension: 'Solflare',
    walletUrl: 'https://solflare.com',
    rateProvider: 'coingecko', // Optional: API to fetch live rates
    estimatedRate: 200, // USD per coin
    description: 'Fast, low-cost payments on Solana',
    minAmount: 0.01,
    priority: 1,
  },
  ethereum: {
    name: 'Ethereum (ERC-20)',
    symbol: 'ETH',
    chain: 'Ethereum',
    icon: 'ethereum',
    address: '0xc530cfc3a9a4e57cb35183ea1f5436aa1f8fc73c',
    explorerUrl: 'https://etherscan.io/tx',
    walletExtension: 'MetaMask',
    walletUrl: 'https://metamask.io',
    estimatedRate: 2500, // USD per ETH (example)
    description: 'Widely supported Ethereum network',
    minAmount: 0.001,
    priority: 2,
  },
  bnb: {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    chain: 'BSC',
    icon: 'bnb',
    address: '0xc530cfc3a9a4e57cb35183ea1f5436aa1f8fc73c',
    explorerUrl: 'https://bscscan.com/tx',
    walletExtension: 'MetaMask',
    walletUrl: 'https://metamask.io',
    estimatedRate: 600, // USD per BNB (example)
    description: 'Low-cost transactions on BSC',
    minAmount: 0.01,
    priority: 3,
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    chain: 'Bitcoin',
    icon: 'bitcoin',
    address: '15Z9UvjeLc5zQ1uhemyCeobvpz7Wg2UaYu',
    explorerUrl: 'https://blockchain.com/btc/tx',
    walletExtension: 'None - Manual Transfer',
    walletUrl: null,
    estimatedRate: 43000, // USD per BTC (example)
    description: 'Most trusted cryptocurrency',
    minAmount: 0.0001,
    priority: 4,
    manualTransfer: true, // Requires manual payment
  },
};

/**
 * Get all payment methods sorted by priority
 */
export function getPaymentMethods() {
  return Object.entries(PAYMENT_METHODS)
    .map(([key, value]) => ({ id: key, ...value }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get a specific payment method by ID
 */
export function getPaymentMethod(methodId) {
  return PAYMENT_METHODS[methodId];
}

/**
 * Get payment method address
 */
export function getPaymentAddress(methodId) {
  const method = PAYMENT_METHODS[methodId];
  return method ? method.address : null;
}

/**
 * Format amount with proper decimals for a payment method
 */
export function formatAmountForMethod(amount, methodId) {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return amount;

  const decimals = methodId === 'bitcoin' ? 8 : methodId === 'solana' ? 9 : 6;
  return parseFloat(amount).toFixed(decimals);
}

/**
 * Convert USD to crypto amount based on current rate
 */
export function usdToCrypto(usdAmount, methodId) {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return 0;

  const cryptoAmount = usdAmount / method.estimatedRate;
  return formatAmountForMethod(cryptoAmount, methodId);
}

/**
 * Convert crypto amount to USD
 */
export function cryptoToUsd(cryptoAmount, methodId) {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return 0;

  return (cryptoAmount * method.estimatedRate).toFixed(2);
}

/**
 * Get explorer link for transaction
 */
export function getExplorerLink(methodId, txHash) {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return null;

  return `${method.explorerUrl}/${txHash}`;
}

/**
 * Check if payment method requires manual transfer
 */
export function isManualPayment(methodId) {
  const method = PAYMENT_METHODS[methodId];
  return method?.manualTransfer || false;
}
