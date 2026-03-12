import { useEffect, useState } from 'react';
import { ArrowUpDown, BriefcaseBusiness, CreditCard, Newspaper, Sparkles, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';
import { extractErrorMessage, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { usePromotionStore } from '@/store/promotion.store';
import { useVipStore } from '@/store/vip.store';
import { useWalletStore } from '@/store/wallet.store';

const quickActions = [
  { label: 'Deposit', icon: CreditCard, path: '/deposit' },
  { label: 'Withdraw', icon: ArrowUpDown, path: '/withdraw' },
  { label: 'Task Center', icon: BriefcaseBusiness, path: '/tasks' },
  { label: 'News', icon: Newspaper, path: '/news' },
];

export const HomePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const balance = useWalletStore((state) => state.balance);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);
  const subscriptions = useVipStore((state) => state.subscriptions);
  const fetchStoreData = useVipStore((state) => state.fetchStoreData);
  const activePromotion = usePromotionStore((state) => state.activePromotion);
  const fetchPromotion = usePromotionStore((state) => state.fetchPromotion);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [submittingGiveawayClaim, setSubmittingGiveawayClaim] = useState(false);

  useEffect(() => {
    void fetchBalance();
    void fetchStoreData();
    void fetchPromotion();
  }, [fetchBalance, fetchPromotion, fetchStoreData]);

  const handleClaimWelcomeBonus = async () => {
    setClaimingBonus(true);

    try {
      const response = await authApi.claimWelcomeBonus();
      updateUser(response.data.user);
      await fetchBalance();
      toast.success(`Welcome bonus claimed: ${formatCurrency(response.data.amount)}`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleReferralGiveawayClaim = async () => {
    setSubmittingGiveawayClaim(true);

    try {
      const response = await authApi.claimReferralTeamBonus();
      updateUser(response.data.user);
      toast.success(`$${response.data.amount.toFixed(2)} giveaway request submitted`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmittingGiveawayClaim(false);
    }
  };

  return (
    <MobileLayout>
      <TopBar />

      <section className="px-4">
        <Card className="overflow-hidden bg-gradient-to-br from-brand-orange/15 via-transparent to-brand-cyan/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Promo window</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {activePromotion?.title ?? 'Momentum Week'}
              </h2>
              <p className="mt-2 max-w-xs text-sm text-slate-300">
                {activePromotion?.subtitle ?? 'Keep deposits clean, clear your daily task quota, and compound faster while the board is hot.'}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-3 text-brand-yellow animate-float">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-3xl border border-white/8 bg-slate-950/35 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Offer ends in</p>
              <CountdownTimer endsAt={activePromotion?.endsAt} />
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live boost</p>
              <p className="text-xl font-semibold text-white">x{activePromotion?.multiplier ?? 1}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="px-4 pt-4">
        <Card className="bg-gradient-to-r from-brand-cyan/10 via-white/5 to-brand-green/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Lucky wheel</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Spin-ready rewards</h3>
              <p className="mt-1 text-sm text-slate-300">Promotions, task streaks, and welcome bonuses converge here.</p>
            </div>
            <div className="rounded-full bg-white/10 p-3 text-brand-yellow">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </section>

      {!user?.welcomeBonusClaimed ? (
        <section className="px-4 pt-4">
          <Card className="overflow-hidden bg-gradient-to-r from-brand-green/15 via-brand-cyan/10 to-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Welcome bonus</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Claim 1 USDT</h3>
                <p className="mt-1 text-sm text-slate-300">
                  New accounts can unlock the starter bonus once. It is not auto-credited anymore.
                </p>
              </div>
              <div className="rounded-full bg-white/10 p-3 text-brand-green">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => void handleClaimWelcomeBonus()} disabled={claimingBonus}>
                {claimingBonus ? 'Claiming...' : 'Claim 1 USDT'}
              </Button>
            </div>
          </Card>
        </section>
      ) : null}

      <section className="px-4 pt-4">
        <Card className="overflow-hidden bg-gradient-to-r from-brand-orange/15 via-brand-yellow/10 to-white/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-200">Referral giveaway</p>
              <h3 className="mt-2 text-xl font-semibold text-white">$500 team reward</h3>
              <p className="mt-1 text-sm text-slate-300">
                Reach {user?.referralSummary?.bonus.targetCount ?? 5} direct members, then submit the giveaway for admin review.
              </p>
            </div>
            <div className="rounded-full bg-white/10 p-3 text-brand-yellow">
              <Trophy className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {user?.referralSummary?.bonus.currentCount ?? 0}/{user?.referralSummary?.bonus.targetCount ?? 5}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-white">
                {user?.referralSummary?.bonus.status ?? 'locked'}
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Amount</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                ${user?.referralSummary?.bonus.amount.toFixed(2) ?? '500.00'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => void handleReferralGiveawayClaim()}
              disabled={!user?.referralSummary?.bonus.eligible || submittingGiveawayClaim}
            >
              {submittingGiveawayClaim ? 'Submitting...' : 'Send $500 claim for review'}
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 p-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              <div className="mb-6 inline-flex rounded-2xl bg-white/8 p-3 text-brand-yellow">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{action.label}</p>
                <p className="mt-1 text-xs text-slate-400">Open module</p>
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-3 gap-2 px-4">
        <StatCard label="Total Balance" value={formatCurrency(balance?.available ?? 0)} color="green" />
        <StatCard label="This Month" value={formatCurrency(balance?.thisMonth ?? 0)} color="cyan" />
        <StatCard label="Pending" value={formatCurrency(balance?.pending ?? 0)} color="amber" />
      </section>

      <section className="px-4 pt-5">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">Stack status</p>
              <h3 className="text-xl font-semibold text-white">Your VIP footprint</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {subscriptions.length} active
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Subscriptions</p>
              <p className="mt-2 text-3xl font-semibold text-white">{subscriptions.length}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Projected daily</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {formatCurrency(subscriptions.reduce((sum, subscription) => sum + subscription.dailyEarnings, 0))}
              </p>
            </div>
          </div>
        </Card>
      </section>
    </MobileLayout>
  );
};

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'green' | 'cyan' | 'amber';
}) => {
  const colorClass = {
    green: 'from-brand-green/20 to-emerald-200/10 text-emerald-300',
    cyan: 'from-brand-cyan/20 to-sky-200/10 text-sky-300',
    amber: 'from-brand-orange/20 to-amber-100/10 text-amber-200',
  }[color];

  return (
    <Card className={`bg-gradient-to-br ${colorClass} p-3`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-base font-semibold text-white">{value}</p>
    </Card>
  );
};
