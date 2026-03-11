import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownToLine, ArrowUpFromLine, BellRing, CircleDollarSign, Crown, Users } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { AdminStats, Deposit, Promotion, Withdrawal } from '@/types';

export const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getDeposits({ page: 1, limit: 4 }),
      adminApi.getWithdrawals({ page: 1, limit: 4 }),
      adminApi.getPromotions(),
    ])
      .then(([statsResponse, depositsResponse, withdrawalsResponse, promotionsResponse]) => {
        setStats(statsResponse.data);
        setDeposits(depositsResponse.data.data);
        setWithdrawals(withdrawalsResponse.data.data);
        setPromotions(promotionsResponse.data);
      })
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, []);

  const recentQueue = useMemo(
    () =>
      [...deposits, ...withdrawals]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 8),
    [deposits, withdrawals],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-brand-orange">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Real platform metrics</h1>
          <p className="mt-2 text-sm text-slate-400">This panel is backed by live database queries. No frontend dummy state remains here.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total users" value={stats?.totalUsers ?? 0} icon={<Users className="h-5 w-5" />} />
          <MetricCard label="Active subscriptions" value={stats?.activeSubscriptions ?? 0} icon={<Crown className="h-5 w-5" />} />
          <MetricCard label="Approved deposits" value={formatCurrency(stats?.totalDeposits ?? 0)} icon={<ArrowDownToLine className="h-5 w-5" />} />
          <MetricCard label="Approved withdrawals" value={formatCurrency(stats?.totalWithdrawals ?? 0)} icon={<ArrowUpFromLine className="h-5 w-5" />} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-white/8 px-5 py-4">
              <h2 className="text-xl font-semibold text-white">Queue snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">Latest deposit and withdrawal activity across the platform.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQueue.map((item) => {
                    const isDeposit = !('walletAddress' in item);
                    return (
                      <tr key={item.id} className="border-t border-white/6">
                        <td className="px-5 py-4">
                          <Badge tone={isDeposit ? 'green' : 'amber'}>{isDeposit ? 'Deposit' : 'Withdrawal'}</Badge>
                        </td>
                        <td className="px-5 py-4 text-white">{item.username ?? item.userId ?? '--'}</td>
                        <td className="px-5 py-4 text-white">{formatCurrency(item.amount)}</td>
                        <td className="px-5 py-4">
                          <Badge tone={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-slate-400">{formatDate(item.createdAt, 'MMM d, p')}</td>
                      </tr>
                    );
                  })}
                  {recentQueue.length === 0 ? (
                    <tr>
                      <td className="px-5 py-5 text-slate-400" colSpan={5}>No queue activity yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Revenue pulse</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Cashflow windows</h2>
                </div>
                <CircleDollarSign className="h-5 w-5 text-brand-cyan" />
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <StatRow label="Today" value={formatCurrency(stats?.dailyRevenue ?? 0)} />
                <StatRow label="7 days" value={formatCurrency(stats?.weeklyRevenue ?? 0)} />
                <StatRow label="This month" value={formatCurrency(stats?.monthlyRevenue ?? 0)} />
                <StatRow label="Pending deposits" value={String(stats?.pendingDeposits ?? 0)} />
                <StatRow label="Pending withdrawals" value={String(stats?.pendingWithdrawals ?? 0)} />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">Promotions</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Live promotion feed</h2>
                </div>
                <BellRing className="h-5 w-5 text-brand-orange" />
              </div>
              <div className="mt-5 space-y-3">
                {promotions.length === 0 ? (
                  <div className="rounded-3xl border border-white/8 bg-white/5 p-4 text-sm text-slate-400">No promotions configured.</div>
                ) : (
                  promotions.slice(0, 4).map((promotion) => (
                    <div key={promotion.id} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{promotion.title}</p>
                        <Badge tone={promotion.isActive ? 'green' : 'slate'}>{promotion.isActive ? 'active' : 'inactive'}</Badge>
                      </div>
                      {promotion.subtitle ? <p className="mt-2 text-sm text-slate-400">{promotion.subtitle}</p> : null}
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                        Multiplier x{promotion.multiplier} {promotion.endsAt ? `• ends ${formatDate(promotion.endsAt, 'MMM d, p')}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const MetricCard = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      </div>
      <div className="rounded-3xl bg-white/5 p-3 text-brand-yellow">{icon}</div>
    </div>
  </Card>
);

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between rounded-3xl bg-white/5 px-4 py-3">
    <span>{label}</span>
    <strong className="text-white">{value}</strong>
  </div>
);
