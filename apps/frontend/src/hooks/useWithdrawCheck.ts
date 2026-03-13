import { useWalletStore } from '@/store/wallet.store';

export const useWithdrawCheck = () => {
  return useWalletStore((state) => state.withdrawalEligibility) ?? {
    hasVIP: false,
    referralWithdrawalRequired: true,
    usedReferral: false,
    referralActivatedVip: false,
    withdrawalFrequencyMet: false,
    withdrawalIntervalDays: 30,
    withdrawalFeePercent: 20,
    withdrawalProcessingHours: 72,
    recentWithdrawalAt: null,
    nextWithdrawalAt: null,
    allMet: false,
  };
};
