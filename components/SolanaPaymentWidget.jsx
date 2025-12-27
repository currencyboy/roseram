'use client';

import { useEffect, useState } from 'react';
import { X, Loader, AlertCircle, Check, ExternalLink } from 'lucide-react';

export function SolanaPaymentWidget({ userId, onSuccess, onClose }) {
  const [amountUsd, setAmountUsd] = useState('25.00');
  const [amountSol, setAmountSol] = useState('0.125');
  const [solRate, setSolRate] = useState(200);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState(null);

  useEffect(() => {
    fetchSolRate();
    checkWalletConnection();
  }, []);

  const fetchSolRate = async () => {
    try {
      const response = await fetch('/api/payments/solana?action=rate');
      if (response.ok) {
        const data = await response.json();
        setSolRate(data.solToUsd);
      }
    } catch (err) {
      console.error('[Solana] Error fetching rate:', err);
    }
  };

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

  const handleAmountChange = (e) => {
    const usd = parseFloat(e.target.value) || 0;
    setAmountUsd(usd.toFixed(2));
    setAmountSol((usd / solRate).toFixed(9));
  };

  const handleSolAmountChange = (e) => {
    const sol = parseFloat(e.target.value) || 0;
    setAmountSol(sol.toFixed(9));
    setAmountUsd((sol * solRate).toFixed(2));
  };

  const handlePayment = async () => {
    if (!walletConnected || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In production, you would:
      // 1. Create a transaction using web3.js
      // 2. Sign it with the connected wallet
      // 3. Send it to the blockchain
      // 4. Wait for confirmation
      // 5. Call your backend with the transaction signature

      // For now, we'll simulate this flow
      const mockSignature = await simulatePayment();
      
      // Record payment in database
      const response = await fetch('/api/payments/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactionSignature: mockSignature,
          amountSol: parseFloat(amountSol),
          walletAddress,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Payment failed');
      }

      const result = await response.json();
      setSuccess(true);
      setTxSignature(mockSignature);

      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async () => {
    // This is a placeholder. In production, use actual Solana transaction signing
    return Promise.resolve('5' + Array(87).fill('a').join(''));
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 rounded-lg">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
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
                href={`https://solscan.io/tx/${txSignature}?cluster=mainnet-beta`}
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
                        onChange={handleAmountChange}
                        className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Amount (SOL)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amountSol}
                        onChange={handleSolAmountChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.001"
                        min="0"
                      />
                      <span className="absolute right-3 top-3 text-gray-500 text-sm">SOL</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Exchange rate</p>
                    <p className="font-medium text-gray-900">1 SOL = ${solRate.toFixed(2)}</p>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={loading || parseFloat(amountUsd) <= 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${amountSol} SOL`
                  )}
                </button>
              </>
            )}

            <p className="text-xs text-gray-500 text-center mt-4">
              Recipient: CbcWb97K3TEFJZJYLZRqdsMSdVXTFaMaUcF6yPQgY9yS
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default SolanaPaymentWidget;
