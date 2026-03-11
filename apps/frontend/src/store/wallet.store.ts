import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { walletApi } from '@/api/wallet.api';
import { extractErrorMessage } from '@/lib/utils';
import type {
  BalanceActivationResponse,
  Balance,
  CreateDepositDto,
  Deposit,
  DepositWallets,
  WithdrawalEligibility,
  WithdrawDto,
  Withdrawal,
} from '@/types';

interface WalletStore {
  balance: Balance | null;
  deposits: Deposit[];
  depositWallets: DepositWallets | null;
  withdrawals: Withdrawal[];
  withdrawalEligibility: WithdrawalEligibility | null;
  loading: boolean;
  fetchBalance: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  createDeposit: (data: CreateDepositDto) => Promise<void>;
  activateVipFromBalance: (vipTierId: string) => Promise<BalanceActivationResponse>;
  fetchDepositWallets: () => Promise<void>;
  fetchWithdrawalEligibility: () => Promise<void>;
  requestWithdrawal: (data: WithdrawDto) => Promise<void>;
  updateBalance: (available: number) => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  balance: null,
  deposits: [],
  depositWallets: null,
  withdrawals: [],
  withdrawalEligibility: null,
  loading: false,
  fetchBalance: async () => {
    set({ loading: true });
    try {
      const response = await walletApi.getBalance();
      set({ balance: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(extractErrorMessage(error));
    }
  },
  fetchHistory: async () => {
    set({ loading: true });
    try {
      const [depositsResponse, withdrawalsResponse] = await Promise.all([
        walletApi.getDeposits(),
        walletApi.getWithdrawals(),
      ]);
      set({
        deposits: depositsResponse.data,
        withdrawals: withdrawalsResponse.data,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      toast.error(extractErrorMessage(error));
    }
  },
  createDeposit: async (data) => {
    try {
      const response = await walletApi.createDeposit(data);
      set((state) => ({ deposits: [response.data, ...state.deposits] }));
      toast.success('Deposit submitted for verification');
    } catch (error) {
      toast.error(extractErrorMessage(error));
      throw error;
    }
  },
  activateVipFromBalance: async (vipTierId) => {
    try {
      const response = await walletApi.activateVipFromBalance(vipTierId);
      const currentBalance = get().balance;
      if (currentBalance) {
        set({
          balance: {
            ...currentBalance,
            available: response.data.remainingBalance,
          },
        });
      }
      toast.success(`${response.data.vipTierName} activated using wallet balance`);
      return response.data;
    } catch (error) {
      toast.error(extractErrorMessage(error));
      throw error;
    }
  },
  fetchDepositWallets: async () => {
    try {
      const response = await walletApi.getDepositWallets();
      set({ depositWallets: response.data });
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  },
  fetchWithdrawalEligibility: async () => {
    try {
      const response = await walletApi.getWithdrawalEligibility();
      set({ withdrawalEligibility: response.data });
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  },
  requestWithdrawal: async (data) => {
    try {
      const response = await walletApi.requestWithdrawal(data);
      set((state) => ({ withdrawals: [response.data, ...state.withdrawals] }));
      const currentBalance = get().balance;
      if (currentBalance) {
        set({
          balance: {
            ...currentBalance,
            available: Math.max(0, currentBalance.available - data.amount),
          },
        });
      }
      const eligibilityResponse = await walletApi.getWithdrawalEligibility();
      set({ withdrawalEligibility: eligibilityResponse.data });
      toast.success(`Withdrawal request submitted. Net payout: ${response.data.netAmount.toFixed(2)} ${response.data.crypto}`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
      throw error;
    }
  },
  updateBalance: (available) => {
    const currentBalance = get().balance;
    if (!currentBalance) {
      return;
    }

    set({
      balance: {
        ...currentBalance,
        available,
      },
    });
  },
}));
