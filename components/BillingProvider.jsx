'use client';

import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { checkUserBalance } from '@/lib/billing-actions';

const BillingContext = createContext();

export function BillingProvider({ children }) {
  const { session } = useAuth();
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setLoading(true);
      const result = await checkUserBalance(session.user.id);

      if (!result) {
        // Server action returned nothing, use default balance
        setBalance({
          allowed: true,
          balance: 25.00,
          remainingFree: 25.00,
          totalPaid: 0,
          totalSpent: 0,
          freeUsed: 0,
          paidUsed: 0,
        });
        return;
      }

      setBalance(result);

      // Auto-open modal if balance is 0
      if (result.balance === 0 && !result.allowed) {
        setBillingModalOpen(true);
      }
    } catch (error) {
      console.error('[BillingProvider] Error checking balance:', error);
      // Set default balance on error
      setBalance({
        allowed: true,
        balance: 25.00,
        remainingFree: 25.00,
        totalPaid: 0,
        totalSpent: 0,
        freeUsed: 0,
        paidUsed: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Check balance on mount and when session changes
  useEffect(() => {
    if (session?.user?.id) {
      refreshBalance();
    }
  }, [session?.user?.id, refreshBalance]);

  // Optionally refresh balance every 30 seconds
  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const interval = setInterval(() => {
      refreshBalance();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id, refreshBalance]);

  const closeBillingModal = useCallback(() => {
    setBillingModalOpen(false);
  }, []);

  const openBillingModal = useCallback(() => {
    setBillingModalOpen(true);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    // Refresh balance after successful payment
    refreshBalance();
    closeBillingModal();
  }, [refreshBalance, closeBillingModal]);

  const value = {
    billingModalOpen,
    setBillingModalOpen,
    openBillingModal,
    closeBillingModal,
    balance,
    refreshBalance,
    loading,
    handlePaymentSuccess,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within BillingProvider');
  }
  return context;
}
