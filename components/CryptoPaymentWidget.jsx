'use client';

import { useEffect, useState } from 'react';
import { X, Loader, AlertCircle, Check, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { getPaymentMethods, getPaymentMethod, usdToCrypto, cryptoToUsd, isManualPayment, getExplorerLink } from '@/lib/payment-methods';

export function CryptoPaymentWidget({ userId, onSuccess, onClose, initialAmount = '25.00' }) {
  const [selectedMethod, setSelectedMethod] = useState('solana');
  const [amountUsd, setAmountUsd] = useState(initialAmount);
  const [amountCrypto, setAmountCrypto] = useState('0.125');
  const [paymentMethods] = useState(getPaymentMethods());
  
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState(null);
  const [copied, setCopied] = useState(false);

  const currentMethod = getPaymentMethod(selectedMethod);

  // Update crypto amount when USD changes
  useEffect(() => {
    const crypto = usdToCrypto(parseFloat(amountUsd) || 0, selectedMethod);
    setAmountCrypto(crypto);
  }, [amountUsd, selectedMethod]);

  // Update USD amount when crypto changes
  const handleCryptoChange = (e) => {
    const crypto = parseFloat(e.target.value) || 0;
    setAmountCrypto(crypto.toString());
    const usd = cryptoToUsd(crypto, selectedMethod);
    setAmountUsd(usd);
  };

  const handleMethodChange = (methodId) => {
    setSelectedMethod(methodId);
    setError(null);
    setSuccess(false);
    setWalletConnected(false);
    setTxSignature(null);
  };

  const handleUsdChange = (e) => {
    const usd = parseFloat(e.target.value) || 0;
    setAmountUsd(usd.toFixed(2));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Solana-specific handlers
  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.solflare) {
      try {
        const resp = await window.solflare.connect();
        setWalletConnected(true);
        setWalletAddress(resp.publicKey.toString());
      } catch (err) {
        console.log('[Solana] Wallet not connected');
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.solflare) {
        setError('Solflare wallet extension not found. Please install it from https://solflare.com');
        return;
      }
      const resp = await window.solflare.connect();
      setWalletConnected(true);
      setWalletAddress(resp.publicKey.toString());
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const handleSolanaPayment = async () => {
    if (!walletConnected || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate payment (in production, use actual Solana transaction)
      const mockSignature = 'sol_' + Array(87).fill('a').join('');
      
      const response = await fetch('/api/payments/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactionSignature: mockSignature,
          amountSol: parseFloat(amountCrypto),
          walletAddress,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Payment failed');
      }

      setSuccess(true);
      setTxSignature(mockSignature);
      setTimeout(() => onSuccess?.(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 rounded-lg">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Top Up Balance</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Payment Confirmed!</h4>
            <p className="text-sm text-gray-600 mb-4">
              ${amountUsd} has been added to your balance
            </p>
            {txSignature && (
              <a
                href={getExplorerLink(selectedMethod, txSignature) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                View Transaction <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-start">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => handleMethodChange(method.id)}
                    className={`p-3 rounded-lg border-2 transition-colors text-left ${
                      selectedMethod === method.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-sm text-gray-900">{method.symbol}</div>
                    <div className="text-xs text-gray-600">{method.name}</div>
                  </button>
                ))}
              </div>
              {currentMethod && (
                <p className="text-xs text-gray-600 mt-2">{currentMethod.description}</p>
              )}
            </div>

            {/* Amount Input */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    value={amountUsd}
                    onChange={handleUsdChange}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="1"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Amount ({currentMethod?.symbol})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amountCrypto}
                    onChange={handleCryptoChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.0001"
                    min="0"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 text-sm">{currentMethod?.symbol}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Exchange rate</p>
                <p className="font-medium text-gray-900">1 {currentMethod?.symbol} = ${currentMethod?.estimatedRate}</p>
              </div>
            </div>

            {/* Solana Wallet Connection */}
            {selectedMethod === 'solana' && (
              <>
                {!walletConnected ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800 mb-4">
                      Connect your Solana wallet to make a payment
                    </p>
                    <button
                      onClick={connectWallet}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Connect Solflare Wallet
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                      <p className="text-xs text-green-600 mb-1">Connected wallet:</p>
                      <p className="text-sm font-mono text-green-900 truncate">{walletAddress}</p>
                    </div>

                    <button
                      onClick={handleSolanaPayment}
                      disabled={loading || parseFloat(amountCrypto) <= 0}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Pay ${amountCrypto} SOL`
                      )}
                    </button>
                  </>
                )}
              </>
            )}

            {/* Manual Payment Instructions */}
            {isManualPayment(selectedMethod) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-2">
                    Send {currentMethod?.symbol} to this address:
                  </p>
                  <div className="bg-white border border-amber-200 rounded p-3 flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-amber-900 break-all flex-1">
                      {currentMethod?.address}
                    </code>
                    <button
                      onClick={() => copyToClipboard(currentMethod?.address)}
                      className="flex-shrink-0 p-2 hover:bg-amber-100 rounded transition-colors"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-amber-600" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-amber-800">
                    <strong>Amount:</strong> {amountCrypto} {currentMethod?.symbol}
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    Once confirmed on the blockchain, your balance will be automatically updated.
                  </p>
                </div>

                <button
                  onClick={() => window.open(currentMethod?.walletUrl, '_blank')}
                  className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                >
                  Open {currentMethod?.symbol} Wallet
                </button>
              </div>
            )}

            {/* Ethereum/BNB Manual Instructions */}
            {['ethereum', 'bnb'].includes(selectedMethod) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-3">
                <p className="text-sm font-semibold text-blue-900">
                  Send {currentMethod?.symbol} to:
                </p>
                <div className="bg-white border border-blue-200 rounded p-3 flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-blue-900 break-all flex-1">
                    {currentMethod?.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(currentMethod?.address)}
                    className="flex-shrink-0 p-2 hover:bg-blue-100 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-blue-800">
                  <strong>Amount:</strong> {amountCrypto} {currentMethod?.symbol}
                </p>
                <p className="text-xs text-blue-800">
                  Confirm your transaction and we'll add funds to your account within minutes.
                </p>
              </div>
            )}

            {/* Info Footer */}
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">
                <strong>Recipient Address:</strong>
              </p>
              <p className="text-xs text-gray-700 font-mono mt-1 break-all">
                {currentMethod?.address}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CryptoPaymentWidget;
