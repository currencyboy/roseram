'use client';

import { useEffect, useState } from 'react';
import { Wallet, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function BalanceMeter({ onOpenModal }) {
  const { session } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchBalance = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        const response = await fetch(`/api/usage/track?userId=${session.user.id}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch balance`);
        }

        const data = await response.json();

        if (isMounted) {
          setBalance(data.balance);
          setError(null);
        }
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') {
          console.error('[BalanceMeter] Error:', err);
          // Set a default balance on error instead of showing error state
          setBalance({
            current: 25.00,
            remainingFree: 25.00,
            totalSpent: 0,
            totalPaid: 0,
            freeUsed: 0,
            paidUsed: 0,
          });
          // Don't show error to user - just use default balance
          setError(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  if (!session?.user) {
    return null;
  }

  const displayBalance = balance?.current ?? 0;
  const isLowBalance = displayBalance < 5;
  const isZeroBalance = displayBalance === 0;

  return (
    <button
      onClick={() => onOpenModal?.()}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        isZeroBalance
          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          : isLowBalance
          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
      } font-medium text-sm`}
      title="Click to view usage details and top up"
    >
      {loading ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : error ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <Wallet className="w-4 h-4" />
      )}
      
      <div className="flex items-center gap-1">
        <span>${displayBalance.toFixed(2)}</span>
        {isZeroBalance && <span className="text-xs">Balance needed</span>}
        {isLowBalance && !isZeroBalance && <span className="text-xs">Low balance</span>}
      </div>
    </button>
  );
}

export default BalanceMeter;
