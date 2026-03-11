import { useEffect, useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TopBar } from '@/components/layout/TopBar';
import { DepositModal } from '@/components/wallet/DepositModal';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { Card } from '@/components/ui/Card';
import { ActiveSubscriptions } from '@/components/vip/ActiveSubscriptions';
import { VIPGrid } from '@/components/vip/VIPGrid';
import { usePromotionStore } from '@/store/promotion.store';
import { useVipStore } from '@/store/vip.store';
import { useWalletStore } from '@/store/wallet.store';
import type { VIPTier } from '@/types';

export const StorePage = () => {
  const tiers = useVipStore((state) => state.tiers);
  const subscriptions = useVipStore((state) => state.subscriptions);
  const fetchStoreData = useVipStore((state) => state.fetchStoreData);
  const deposits = useWalletStore((state) => state.deposits);
  const fetchHistory = useWalletStore((state) => state.fetchHistory);
  const activePromotion = usePromotionStore((state) => state.activePromotion);
  const fetchPromotion = usePromotionStore((state) => state.fetchPromotion);
  const [selectedTier, setSelectedTier] = useState<VIPTier | null>(null);
  const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));
  const highestActiveSortOrder = subscriptions.reduce((max, subscription) => {
    const tier = tierMap.get(subscription.vipTierId);
    return Math.max(max, tier?.sortOrder ?? 0);
  }, 0);
  const lockedTierIds = subscriptions.length === 0
    ? []
    : tiers.filter((tier) => tier.sortOrder < highestActiveSortOrder).map((tier) => tier.id);
  const ownedTierIds = Array.from(new Set(subscriptions.map((subscription) => subscription.vipTierId)));
  const pendingTierIds = Array.from(
    new Set(
      deposits
        .filter((deposit) => deposit.status === 'pending' && deposit.vipTierId)
        .map((deposit) => deposit.vipTierId as string),
    ),
  );

  useEffect(() => {
    void fetchStoreData();
    void fetchHistory();
    void fetchPromotion();
  }, [fetchHistory, fetchPromotion, fetchStoreData]);

  return (
    <MobileLayout>
      <TopBar />

      {activePromotion ? (
        <section className="px-4">
          <Card className="overflow-hidden bg-gradient-to-r from-brand-orange/20 via-transparent to-brand-green/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Active promo</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{activePromotion.title} ⚡</h2>
                <p className="mt-2 text-sm text-slate-300">{activePromotion.subtitle}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ends in</p>
                <CountdownTimer endsAt={activePromotion.endsAt} />
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {subscriptions.length > 0 ? <ActiveSubscriptions subs={subscriptions} /> : null}

      <div className="px-4 py-2">
        <h2 className="text-xl font-semibold text-white">Select VIP level</h2>
        <p className="mt-1 text-sm text-slate-400">
          {subscriptions.length > 0
            ? 'Upgrade is allowed, but downgrades are blocked. You can only activate your current tier or a higher one.'
            : 'Use a referral code to join, then activate your first tier to unlock tasks.'}
        </p>
      </div>

      <VIPGrid
        tiers={tiers}
        activeIds={subscriptions.map((subscription) => subscription.vipTierId)}
        lockedTierIds={lockedTierIds}
        ownedTierIds={ownedTierIds}
        pendingTierIds={pendingTierIds}
        bonusMultiplier={activePromotion?.multiplier ?? 1}
        onSelect={(tier) => setSelectedTier(tier)}
      />

      <DepositModal isOpen={Boolean(selectedTier)} vipTier={selectedTier} onClose={() => setSelectedTier(null)} />
    </MobileLayout>
  );
};
