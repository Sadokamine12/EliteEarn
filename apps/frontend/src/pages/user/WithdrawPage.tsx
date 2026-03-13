import { useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Badge } from '@/components/ui/Badge';
import { BalanceCard } from '@/components/wallet/BalanceCard';
import { WithdrawForm } from '@/components/wallet/WithdrawForm';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { useWithdrawCheck } from '@/hooks/useWithdrawCheck';
import { useVipStore } from '@/store/vip.store';
import { useWalletStore } from '@/store/wallet.store';

export const WithdrawPage = () => {
  const balance = useWalletStore((state) => state.balance);
  const withdrawals = useWalletStore((state) => state.withdrawals);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);
  const fetchHistory = useWalletStore((state) => state.fetchHistory);
  const fetchWithdrawalEligibility = useWalletStore((state) => state.fetchWithdrawalEligibility);
  const requestWithdrawal = useWalletStore((state) => state.requestWithdrawal);
  const fetchStoreData = useVipStore((state) => state.fetchStoreData);
  const withdrawalStatus = useWithdrawCheck();
  const conditions = [
    { label: 'Active VIP subscription', met: withdrawalStatus.hasVIP },
    ...(withdrawalStatus.referralWithdrawalRequired
      ? [
          { label: 'Referral code used', met: withdrawalStatus.usedReferral },
          {
            label: 'Referred user activated VIP',
            met: withdrawalStatus.referralActivatedVip,
            description: 'This stays red until the invited account upgrades.',
          },
        ]
      : []),
    {
      label: `Withdrawal cooldown (${withdrawalStatus.withdrawalIntervalDays} days)`,
      met: withdrawalStatus.withdrawalFrequencyMet,
      description: withdrawalStatus.nextWithdrawalAt
        ? `Next withdrawal unlocks on ${formatDate(withdrawalStatus.nextWithdrawalAt, 'MMM d, yyyy p')}.`
        : 'No cooldown is currently blocking withdrawals.',
    },
  ];

  useEffect(() => {
    void fetchBalance();
    void fetchHistory();
    void fetchWithdrawalEligibility();
    void fetchStoreData();
  }, [fetchBalance, fetchHistory, fetchStoreData, fetchWithdrawalEligibility]);

  return (
    <MobileLayout>
      <TopBar />
      <div className="space-y-5">
        <BalanceCard balance={balance} />

        {!withdrawalStatus.allMet ? (
          <div className="px-4">
            <Card className="p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-brand-red">Withdrawal locked</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {conditions.length} conditions must be green before payout opens.
              </h2>
              <div className="mt-5 space-y-3">
                {conditions.map((condition) => (
                  <ConditionRow
                    key={condition.label}
                    label={condition.label}
                    met={condition.met}
                    description={condition.description}
                  />
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        <WithdrawForm
          maxAmount={balance?.available ?? 0}
          feePercent={withdrawalStatus.withdrawalFeePercent}
          disabled={!withdrawalStatus.allMet}
          minAmount={10}
          onSubmit={(amount, walletAddress) => requestWithdrawal({ amount, walletAddress })}
        />

        <div className="px-4">
          <Card className="p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Processing window</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Withdrawals are reviewed within {withdrawalStatus.withdrawalProcessingHours} hours.</h2>
            <p className="mt-2 text-sm text-slate-400">
              After you submit a payout request, the admin team has up to {withdrawalStatus.withdrawalProcessingHours} hours to verify and approve it.
            </p>
          </Card>
        </div>

        <section className="px-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent withdrawals</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Audit trail</span>
          </div>
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <Card className="p-6 text-sm text-slate-400">No withdrawal requests yet.</Card>
            ) : (
              withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{withdrawal.netAmount.toFixed(2)} {withdrawal.crypto}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Requested {withdrawal.amount.toFixed(2)} • Fee {withdrawal.feeAmount.toFixed(2)} ({withdrawal.feePercent.toFixed(0)}%)
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{formatDate(withdrawal.createdAt, 'MMM d, p')}</p>
                    </div>
                    <Badge tone={withdrawal.status === 'approved' ? 'green' : withdrawal.status === 'rejected' ? 'red' : 'amber'}>
                      {withdrawal.status}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

const ConditionRow = ({
  label,
  met,
  description,
}: {
  label: string;
  met: boolean;
  description?: string;
}) => (
  <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-white">{label}</p>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      <Badge tone={met ? 'green' : 'red'}>{met ? 'Met' : 'Locked'}</Badge>
    </div>
  </div>
);
