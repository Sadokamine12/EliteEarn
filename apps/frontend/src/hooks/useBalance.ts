import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore } from '@/store/wallet.store';

export const useBalance = () => {
  const token = useAuthStore((state) => state.token);
  const balance = useWalletStore((state) => state.balance);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);

  useEffect(() => {
    if (!token) {
      return;
    }

    void fetchBalance();
    const interval = window.setInterval(() => {
      void fetchBalance();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [fetchBalance, token]);

  return balance;
};
