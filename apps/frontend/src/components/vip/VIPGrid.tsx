import { VIPCard } from './VIPCard';
import type { VIPTier } from '@/types';

interface VIPGridProps {
  tiers: VIPTier[];
  activeIds: string[];
  lockedTierIds?: string[];
  ownedTierIds?: string[];
  pendingTierIds?: string[];
  bonusMultiplier?: number;
  onSelect: (tier: VIPTier) => void;
}

export const VIPGrid = ({
  tiers,
  activeIds,
  lockedTierIds = [],
  ownedTierIds = [],
  pendingTierIds = [],
  bonusMultiplier,
  onSelect,
}: VIPGridProps) => (
  <div className="grid gap-4 px-4 pb-6 sm:grid-cols-2">
    {tiers.map((tier) => (
      <VIPCard
        key={tier.id}
        tier={tier}
        isActive={activeIds.includes(tier.id)}
        isUpgradeBlocked={lockedTierIds.includes(tier.id)}
        isOwned={ownedTierIds.includes(tier.id)}
        isPending={pendingTierIds.includes(tier.id)}
        bonusMultiplier={bonusMultiplier}
        onSelect={onSelect}
      />
    ))}
  </div>
);
