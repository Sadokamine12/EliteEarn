import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TopBar } from '@/components/layout/TopBar';
import { DepositModal } from '@/components/wallet/DepositModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useVipStore } from '@/store/vip.store';
import { useWalletStore } from '@/store/wallet.store';
import type { VIPTier } from '@/types';

export const DepositPage = () => {
  const tiers = useVipStore((state) => state.tiers);
  const subscriptions = useVipStore((state) => state.subscriptions);
  const fetchStoreData = useVipStore((state) => state.fetchStoreData);
  const deposits = useWalletStore((state) => state.deposits);
  const depositWallets = useWalletStore((state) => state.depositWallets);
  const fetchDepositWallets = useWalletStore((state) => state.fetchDepositWallets);
  const fetchHistory = useWalletStore((state) => state.fetchHistory);
  const [selectedTier, setSelectedTier] = useState<VIPTier | null>(null);
  const ownedTierIds = new Set(subscriptions.map((subscription) => subscription.vipTierId));
  const pendingTierIds = new Set(
    deposits
      .filter((deposit) => deposit.status === 'pending' && deposit.vipTierId)
      .map((deposit) => deposit.vipTierId as string),
  );

  useEffect(() => {
    void fetchStoreData();
    void fetchHistory();
    void fetchDepositWallets();
  }, [fetchDepositWallets, fetchHistory, fetchStoreData]);

  const featuredTiers = useMemo(() => tiers.slice(0, 3), [tiers]);

  return (
    <MobileLayout>
      <TopBar />

      <section className="px-4">
        <Card className="p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">Deposit lane</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Send USDT, submit proof, then wait for verification.</h2>
          <p className="mt-2 text-sm text-slate-300">
            Choose a network address below, send the exact tier amount, then submit the deposit form. Admin verifies the transaction before the VIP activates.
          </p>
        </Card>
      </section>

      <section className="px-4 pt-4">
        <div className="grid gap-3 lg:grid-cols-3">
          {([
            ['ERC20', depositWallets?.USDT_ERC20],
            ['TRC20', depositWallets?.USDT_TRC20],
            ['BEP20', depositWallets?.USDT_BEP20],
          ] as const).map(([label, address]) => (
            <Card key={label} className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-cyan">USDT {label}</p>
              <p className="mt-3 break-all text-sm text-white">{address || 'Not configured'}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3 px-4 pt-4">
        {featuredTiers.map((tier) => (
          <Card key={tier.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <Badge tone={pendingTierIds.has(tier.id) ? 'amber' : ownedTierIds.has(tier.id) ? 'green' : 'amber'}>
                {pendingTierIds.has(tier.id) ? 'Pending verification' : ownedTierIds.has(tier.id) ? 'Already activated' : `${tier.dailyTasksCount} tasks/day`}
              </Badge>
              <h3 className="mt-3 text-xl font-semibold text-white">{tier.name}</h3>
              <p className="mt-1 text-sm text-slate-400">Daily earnings {formatCurrency(tier.dailyEarnings)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-white">{formatCurrency(tier.price)}</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => setSelectedTier(tier)}
                disabled={ownedTierIds.has(tier.id) || pendingTierIds.has(tier.id)}
              >
                {pendingTierIds.has(tier.id)
                  ? 'Pending'
                  : ownedTierIds.has(tier.id)
                    ? 'Activated'
                    : 'Activate'}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent deposits</h3>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest first</span>
        </div>
        <div className="space-y-3">
          {deposits.length === 0 ? (
            <Card className="p-6 text-sm text-slate-400">No deposits submitted yet.</Card>
          ) : (
            deposits.map((deposit) => (
              <Card key={deposit.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{formatCurrency(deposit.amount)} via {deposit.crypto}</p>
                    <p className="mt-1 text-sm text-slate-400">Requested {formatDate(deposit.createdAt, 'MMM d, p')}</p>
                  </div>
                  <Badge tone={deposit.status === 'approved' ? 'green' : deposit.status === 'rejected' ? 'red' : 'amber'}>
                    {deposit.status}
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <DepositModal isOpen={Boolean(selectedTier)} vipTier={selectedTier} onClose={() => setSelectedTier(null)} />
    </MobileLayout>
  );
};
