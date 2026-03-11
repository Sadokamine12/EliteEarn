import api from './axios';
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

export const walletApi = {
  getBalance: () => api.get<Balance>('/api/wallet/balance'),
  createDeposit: (data: CreateDepositDto) => api.post<Deposit>('/api/wallet/deposits', data),
  activateVipFromBalance: (vipTierId: string) =>
    api.post<BalanceActivationResponse>('/api/wallet/deposits/activate-from-balance', { vipTierId }),
  getDepositWallets: () => api.get<DepositWallets>('/api/wallet/deposit-wallets'),
  getDeposits: () => api.get<Deposit[]>('/api/wallet/deposits'),
  getWithdrawalEligibility: () => api.get<WithdrawalEligibility>('/api/wallet/withdrawals/eligibility'),
  requestWithdrawal: (data: WithdrawDto) => api.post<Withdrawal>('/api/wallet/withdrawals', data),
  getWithdrawals: () => api.get<Withdrawal[]>('/api/wallet/withdrawals'),
};
