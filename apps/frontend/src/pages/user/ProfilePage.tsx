import { useEffect, useMemo, useState } from 'react';
import { Copy, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingBonusClaim, setIsSubmittingBonusClaim] = useState(false);
  const referralBonusAmount = user?.referralSummary?.bonus.amount ?? 0;
  const referralBonusCurrent = user?.referralSummary?.bonus.currentCount ?? 0;
  const referralBonusTarget = user?.referralSummary?.bonus.targetCount ?? 5;
  const referralBonusStatus = user?.referralSummary?.bonus.status ?? 'locked';
  const referralBonusEligible = user?.referralSummary?.bonus.eligible ?? false;

  useEffect(() => {
    setUsername(user?.username ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  const isDirty = useMemo(
    () => username.trim() !== (user?.username ?? '') || email.trim() !== (user?.email ?? ''),
    [email, user?.email, user?.username, username],
  );

  const handleSave = async () => {
    if (!isDirty) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await authApi.updateMe({
        username: username.trim(),
        email: email.trim(),
      });
      updateUser(response.data);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const copyReferralCode = async () => {
    if (!user?.referralCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(user.referralCode);
      toast.success('Referral code copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const copySupportUid = async () => {
    if (!user?.supportUid) {
      return;
    }

    try {
      await navigator.clipboard.writeText(user.supportUid);
      toast.success('Support UID copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const submitReferralTeamBonusClaim = async () => {
    setIsSubmittingBonusClaim(true);
    try {
      const response = await authApi.claimReferralTeamBonus();
      updateUser(response.data.user);
      toast.success(`$${response.data.amount.toFixed(2)} giveaway request submitted`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmittingBonusClaim(false);
    }
  };

  return (
    <MobileLayout>
      <TopBar />
      <div className="space-y-5 px-4 pb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Account settings</h1>
          <p className="mt-1 text-sm text-slate-400">Update your public account information and review your referral details.</p>
        </div>

        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
                placeholder="Your username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
                placeholder="you@example.com"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void handleSave()} disabled={!isDirty || isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">Referral</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Support UID</p>
              <p className="mt-2 text-xl font-semibold text-white">{user?.supportUid ?? '--'}</p>
              <p className="mt-2 text-sm text-slate-400">Share this 6-digit ID with support so your account can be identified quickly.</p>
              <Button className="mt-4" variant="secondary" size="sm" onClick={copySupportUid}>
                <Copy className="h-4 w-4" />
                Copy UID
              </Button>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Your referral code</p>
              <p className="mt-2 text-xl font-semibold text-white">{user?.referralCode ?? '--'}</p>
              <Button className="mt-4" variant="secondary" size="sm" onClick={copyReferralCode}>
                <Copy className="h-4 w-4" />
                Copy code
              </Button>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Referral source</p>
              <p className="mt-2 text-xl font-semibold text-white">{user?.referredBy ?? 'Direct signup unavailable'}</p>
              <p className="mt-2 text-sm text-slate-400">A referral code is required for all new accounts.</p>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/8 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Users joined with your referral code</p>
                <p className="mt-2 text-2xl font-semibold text-white">{user?.referralSummary?.count ?? 0}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {(user?.referralSummary?.users?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-400">No referred users yet.</p>
              ) : (
                user?.referralSummary?.users.map((invitee) => (
                  <div
                    key={invitee.id}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                  >
                    <p className="font-medium text-white">{invitee.email}</p>
                    <p className="text-sm text-slate-400">{formatDate(invitee.createdAt, 'MMM d, yyyy')}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/8 bg-white/5 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-brand-green">Team giveaway</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatCurrency(referralBonusAmount)}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {referralBonusCurrent} / {referralBonusTarget} direct members
                </p>
              </div>
              <div className="space-y-2 text-right text-sm text-slate-400">
                <p>Status: <span className="font-semibold capitalize text-white">{referralBonusStatus}</span></p>
                {user?.referralSummary?.bonus.requestedAt ? (
                  <p>Requested {formatDate(user.referralSummary.bonus.requestedAt, 'MMM d, yyyy')}</p>
                ) : null}
                {user?.referralSummary?.bonus.reviewedAt ? (
                  <p>Reviewed {formatDate(user.referralSummary.bonus.reviewedAt, 'MMM d, yyyy')}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-slate-300">
              This bonus is not credited automatically. Once you reach the target, submit it for admin review.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => void submitReferralTeamBonusClaim()}
                disabled={
                  !referralBonusEligible ||
                  isSubmittingBonusClaim
                }
              >
                {isSubmittingBonusClaim
                  ? 'Submitting...'
                  : `Send ${formatCurrency(referralBonusAmount)} claim for review`}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(user?.referralSummary?.levels ?? []).map((level) => (
              <div key={level.level} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Team LVL {level.level}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{level.percent}%</p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span>Total members</span>
                    <span className="font-semibold text-white">{level.totalMembers}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Active VIP members</span>
                    <span className="font-semibold text-white">{level.activeMembers}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Total earned</span>
                    <span className="font-semibold text-brand-green">${level.totalEarned.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-green">Account status</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <InfoTile label="Role" value={user?.role ?? '--'} />
            <InfoTile label="Status" value={user?.status ?? '--'} />
            <InfoTile label="Joined" value={formatDate(user?.createdAt, 'MMM d, yyyy')} />
          </div>
        </Card>
      </div>
    </MobileLayout>
  );
};

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-semibold capitalize text-white">{value}</p>
  </div>
);
