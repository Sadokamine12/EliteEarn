import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, Wallet } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { PaginatedResponse, PlatformSetting, ReferralTeamBonusClaim, User } from '@/types';

type BalanceField = 'available' | 'pending' | 'total_earned' | 'this_month';
type BalanceOperation = 'credit' | 'debit' | 'set';

export const UsersPage = () => {
  const [response, setResponse] = useState<PaginatedResponse<User>>({ data: [], page: 1, limit: 20, total: 0 });
  const [bonusClaims, setBonusClaims] = useState<ReferralTeamBonusClaim[]>([]);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [field, setField] = useState<BalanceField>('available');
  const [operation, setOperation] = useState<BalanceOperation>('credit');
  const [amount, setAmount] = useState('0');
  const [busyId, setBusyId] = useState<string | null>(null);

  const referralTeamBonusAmount = useMemo(() => {
    const amount = Number(
      settings.find((setting) => setting.key === 'referral_team_bonus_amount')?.value ?? '500',
    );
    return Number.isFinite(amount) ? amount : 500;
  }, [settings]);

  const loadUsers = async () => {
    try {
      const [usersResult, claimsResult, settingsResult] = await Promise.all([
        adminApi.getUsers({ page: 1, limit: 20 }),
        adminApi.getReferralTeamBonusClaims(),
        adminApi.getSettings(),
      ]);
      setResponse(usersResult.data);
      setBonusClaims(claimsResult.data);
      setSettings(settingsResult.data);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openBalanceModal = (user: User) => {
    setSelectedUser(user);
    setField('available');
    setOperation('credit');
    setAmount('0');
  };

  const handleBalanceSave = async () => {
    if (!selectedUser) {
      return;
    }

    setBusyId(selectedUser.id);
    try {
      await adminApi.adjustUserBalance(selectedUser.id, {
        field,
        operation,
        amount: Number(amount),
      });
      toast.success('Balance updated');
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (user: User) => {
    setBusyId(user.id);
    try {
      await adminApi.updateUserStatus(user.id, user.status === 'active' ? 'banned' : 'active');
      toast.success(`User ${user.status === 'active' ? 'banned' : 'reactivated'}`);
      await loadUsers();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const reviewBonusClaim = async (claimId: string, action: 'approve' | 'reject') => {
    setBusyId(claimId);
    try {
      if (action === 'approve') {
        await adminApi.approveReferralTeamBonusClaim(claimId);
      } else {
        await adminApi.rejectReferralTeamBonusClaim(claimId);
      }
      toast.success(`Giveaway request ${action}d`);
      await loadUsers();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <Card className="overflow-hidden">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="text-xl font-semibold text-white">Referral giveaway claims</h2>
          <p className="mt-1 text-sm text-slate-400">
            Review the {formatCurrency(referralTeamBonusAmount)} milestone requests before any credit is applied.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Requested</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bonusClaims.length === 0 ? (
                <tr className="border-t border-white/6">
                  <td className="px-5 py-4 text-slate-400" colSpan={6}>No giveaway claims submitted yet.</td>
                </tr>
              ) : (
                bonusClaims.map((claim) => (
                  <tr key={claim.id} className="border-t border-white/6">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-white">{claim.username}</p>
                        <p className="text-slate-400">{claim.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{claim.targetCount} direct members</td>
                    <td className="px-5 py-4 font-medium text-white">{formatCurrency(claim.bonusAmount)}</td>
                    <td className="px-5 py-4">
                      <Badge tone={claim.status === 'approved' ? 'green' : claim.status === 'rejected' ? 'red' : 'amber'}>
                        {claim.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{formatDate(claim.createdAt, 'MMM d, yyyy')}</td>
                    <td className="px-5 py-4">
                      {claim.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void reviewBonusClaim(claim.id, 'approve')} disabled={busyId === claim.id}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => void reviewBonusClaim(claim.id, 'reject')} disabled={busyId === claim.id}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {claim.reviewedByUsername ? `Reviewed by ${claim.reviewedByUsername}` : 'Reviewed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="text-xl font-semibold text-white">Users</h2>
          <p className="mt-1 text-sm text-slate-400">{response.total} total users across the current page set.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Balance</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Referral</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {response.data.map((user) => (
                <tr key={user.id} className="border-t border-white/6">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-white">{user.username}</p>
                      <p className="text-slate-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-white">{formatCurrency(user.balance?.available ?? 0)}</p>
                      <p className="text-xs text-slate-500">Pending {formatCurrency(user.balance?.pending ?? 0)}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge tone={user.status === 'active' ? 'green' : 'red'}>{user.status}</Badge></td>
                  <td className="px-5 py-4"><Badge tone={user.role === 'admin' ? 'amber' : 'slate'}>{user.role}</Badge></td>
                  <td className="px-5 py-4 text-slate-300">{user.referralCode}</td>
                  <td className="px-5 py-4 text-slate-400">{formatDate(user.createdAt, 'MMM d, yyyy')}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openBalanceModal(user)}>
                        <Wallet className="h-4 w-4" />
                        Balance
                      </Button>
                      <Button size="sm" variant={user.status === 'active' ? 'danger' : 'secondary'} onClick={() => void toggleStatus(user)} disabled={busyId === user.id}>
                        <Ban className="h-4 w-4" />
                        {user.status === 'active' ? 'Ban' : 'Unban'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title={selectedUser ? `Adjust balance: ${selectedUser.username}` : 'Adjust balance'}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-300">
              <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Field</span>
              <select value={field} onChange={(event) => setField(event.target.value as BalanceField)} className="w-full rounded-[24px] border border-white/10 bg-bg-secondary px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40">
                <option value="available">Available</option>
                <option value="pending">Pending</option>
                <option value="total_earned">Total earned</option>
                <option value="this_month">This month</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-300">
              <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Operation</span>
              <select value={operation} onChange={(event) => setOperation(event.target.value as BalanceOperation)} className="w-full rounded-[24px] border border-white/10 bg-bg-secondary px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40">
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
                <option value="set">Set</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-300">
              <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Amount</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.01" className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40" />
            </label>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/5 p-4 text-sm text-slate-400">
            Activation deposits should usually not be credited to user balance. They buy the VIP subscription directly. Use this only for bonuses, refunds, or manual corrections.
          </div>

          <div className="flex gap-3">
            <Button onClick={() => void handleBalanceSave()} disabled={!selectedUser || Number(amount) < 0 || busyId === selectedUser?.id}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setSelectedUser(null)} disabled={busyId === selectedUser?.id}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};
