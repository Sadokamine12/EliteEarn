import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { AdminLedgerQuery, Withdrawal } from '@/types';

const defaultFilters: AdminLedgerQuery = {
  page: 1,
  limit: 10,
  search: '',
  status: '',
  crypto: '',
};

export const WithdrawalsPage = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filters, setFilters] = useState<AdminLedgerQuery>(defaultFilters);
  const [query, setQuery] = useState<AdminLedgerQuery>(defaultFilters);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Number(query.limit ?? 10))),
    [query.limit, total],
  );

  const loadWithdrawals = async (nextQuery: AdminLedgerQuery) => {
    setIsLoading(true);
    try {
      const response = await adminApi.getWithdrawals(nextQuery);
      setWithdrawals(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWithdrawals(query);
  }, [query]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      if (action === 'approve') {
        await adminApi.approveWithdrawal(id);
        toast.success('Withdrawal approved');
      } else {
        await adminApi.rejectWithdrawal(id);
        toast.success('Withdrawal rejected');
      }

      await loadWithdrawals(query);
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
          <h2 className="text-xl font-semibold text-white">Withdrawals</h2>
          <p className="mt-1 text-sm text-slate-400">Review payout requests from the live withdrawal ledger.</p>
        </div>

        <div className="border-b border-white/8 px-5 py-5">
          <div className="grid gap-3 xl:grid-cols-[1.4fr,0.8fr,0.8fr,0.6fr,auto,auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={filters.search ?? ''}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search user, email, wallet..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </label>

            <select
              value={filters.status ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AdminLedgerQuery['status'] }))}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filters.crypto ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, crypto: event.target.value }))}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
            >
              <option value="">All payout rails</option>
              <option value="USDT_BEP20">USDT BEP20</option>
              <option value="BTC">BTC</option>
            </select>

            <select
              value={String(filters.limit ?? 10)}
              onChange={(event) => setFilters((current) => ({ ...current, limit: Number(event.target.value) }))}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>

            <Button variant="secondary" onClick={() => setQuery({ ...filters, page: 1 })}>
              Apply
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters(defaultFilters);
                setQuery(defaultFilters);
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="space-y-3 p-5">
          {isLoading ? (
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">Loading withdrawals...</div>
          ) : withdrawals.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">No withdrawal requests match the current filters.</div>
          ) : (
            withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">{formatCurrency(withdrawal.netAmount)} {withdrawal.crypto}</p>
                    <p className="text-sm text-slate-400">
                      {withdrawal.username ?? withdrawal.email ?? 'Unknown user'} • {formatDate(withdrawal.createdAt, 'MMM d, p')}
                    </p>
                    <p className="text-xs text-slate-500">
                      Requested {formatCurrency(withdrawal.amount)} • Fee {formatCurrency(withdrawal.feeAmount)} ({withdrawal.feePercent.toFixed(0)}%)
                    </p>
                    <p className="text-xs text-slate-500">Wallet: {withdrawal.walletAddress}</p>
                  </div>
                  <Badge tone={withdrawal.status === 'approved' ? 'green' : withdrawal.status === 'rejected' ? 'red' : 'amber'}>
                    {withdrawal.status}
                  </Badge>
                </div>
                {withdrawal.status === 'pending' ? (
                  <div className="mt-4 flex gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border border-brand-green/20 bg-brand-green/10 text-emerald-300 hover:bg-brand-green/15"
                      onClick={() => void handleAction(withdrawal.id, 'approve')}
                      disabled={busyId === withdrawal.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void handleAction(withdrawal.id, 'reject')}
                      disabled={busyId === withdrawal.id}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}

          <Pagination
            page={query.page ?? 1}
            total={total}
            limit={query.limit ?? 10}
            totalPages={totalPages}
            onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
          />
        </div>
      </Card>
    </AdminLayout>
  );
};

const Pagination = ({
  page,
  total,
  limit,
  totalPages,
  onPageChange,
}: {
  page: number;
  total: number;
  limit: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
      <p className="text-sm text-slate-400">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <span className="flex items-center text-sm text-slate-400">
          Page {page} / {totalPages}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
};
