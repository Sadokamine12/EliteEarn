import { ArrowRight, Coins, Layers3, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { VIPTier } from '@/types';

interface VIPCardProps {
  tier: VIPTier;
  isActive?: boolean;
  isUpgradeBlocked?: boolean;
  isOwned?: boolean;
  isPending?: boolean;
  bonusMultiplier?: number;
  onSelect: (tier: VIPTier) => void;
}

export const VIPCard = ({
  tier,
  isActive,
  isUpgradeBlocked,
  isOwned,
  isPending,
  bonusMultiplier = 1,
  onSelect,
}: VIPCardProps) => {
  const boostedDaily = tier.dailyEarnings * bonusMultiplier;

  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Badge tone={isPending ? 'amber' : isOwned || isActive ? 'green' : isUpgradeBlocked ? 'red' : 'amber'}>
            {isPending ? 'Pending' : isOwned || isActive ? 'Owned' : isUpgradeBlocked ? 'Locked' : 'Open'}
          </Badge>
          <h3 className="mt-3 text-lg font-semibold text-white">{tier.name}</h3>
          <p className="text-sm text-slate-400">{tier.durationDays} day membership</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3 text-brand-yellow">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
          <span className="flex items-center gap-2"><Coins className="h-4 w-4 text-brand-green" /> Entry</span>
          <strong className="text-white">{formatCurrency(tier.price)}</strong>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-orange" /> Daily</span>
          <strong className="text-white">{formatCurrency(boostedDaily)}</strong>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
          <span className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-brand-cyan" /> Tasks</span>
          <strong className="text-white">{tier.dailyTasksCount}</strong>
        </div>
      </div>

      <Button
        className="mt-5 w-full"
        onClick={() => onSelect(tier)}
        variant={isActive ? 'secondary' : 'primary'}
        disabled={isUpgradeBlocked || isOwned || isPending}
      >
        {isPending
          ? 'Verification Pending'
          : isOwned || isActive
            ? 'Already Activated'
            : isUpgradeBlocked
              ? 'Upgrade Required'
              : 'Activate Tier'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
};
