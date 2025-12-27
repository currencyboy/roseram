import { useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { checkUserBalance } from '@/lib/billing-actions';

/**
 * Hook to manage billing modal state and auto-open when balance is 0
 * Usage in components:
 * const { billingModalOpen, setBillingModalOpen, balance } = useBillingModal();
 */
export function useBillingModal() {
  const { session } = useAuth();

  // This hook will be used with a context provider to manage global state
  // For now, we'll return a basic interface that components can use
  
  const checkBalance = useCallback(async () => {
    if (!session?.user?.id) {
      return { allowed: false, balance: 0 };
    }

    try {
      const result = await checkUserBalance(session.user.id);
      return result;
    } catch (error) {
      console.error('[useBillingModal] Error checking balance:', error);
      return { allowed: false, balance: 0 };
    }
  }, [session?.user?.id]);

  return {
    checkBalance,
    userId: session?.user?.id,
  };
}
