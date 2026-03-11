import { Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Subscription } from '@/types';

interface ActiveSubscriptionsProps {
  subs: Subscription[];
  showBonus?: boolean;
}

export const ActiveSubscriptions = ({ subs, showBonus }: ActiveSubscriptionsProps) => (
  <Card className="mx-4 mb-5 overflow-hidden p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">Live Stack</p>
        <h2 className="text-xl font-semibold text-white">Active subscriptions</h2>
      </div>
      {showBonus ? <Badge tone="amber">Bonus boost</Badge> : <Badge tone="green">{subs.length} active</Badge>}
    </div>
    <div className="space-y-3">
      {subs.map((subscription) => (
        <div
          key={subscription.id}
          className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-orange/15 p-2 text-brand-yellow">
              {showBonus ? <Zap className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-medium text-white">{subscription.tierName ?? 'VIP Subscription'}</p>
              <p className="text-sm text-slate-400">Ends {formatDate(subscription.expiresAt, 'MMM d')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Daily earnings</p>
            <p className="font-semibold text-white">{formatCurrency(subscription.dailyEarnings)}</p>
          </div>
        </div>
      ))}
    </div>
  </Card>
);
