import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { AdminLedgerQuery, Deposit } from '@/types';

const defaultFilters: AdminLedgerQuery = {
  page: 1,
  limit: 10,
  search: '',
  status: '',
  crypto: '',
};

export const DepositsPage = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [filters, setFilters] = useState<AdminLedgerQuery>(defaultFilters);
  const [query, setQuery] = useState<AdminLedgerQuery>(defaultFilters);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Number(query.limit ?? 10))),
    [query.limit, total],
  );

  const loadDeposits = async (nextQuery: AdminLedgerQuery) => {
    setIsLoading(true);
    try {
      const response = await adminApi.getDeposits(nextQuery);
      setDeposits(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDeposits(query);
  }, [query]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      if (action === 'approve') {
        await adminApi.approveDeposit(id);
        toast.success('Deposit approved');
      } else {
        await adminApi.rejectDeposit(id);
        toast.success('Deposit rejected');
      }

      await loadDeposits(query);
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
          <h2 className="text-xl font-semibold text-white">Deposits</h2>
          <p className="mt-1 text-sm text-slate-400">Review submitted deposits, verify the proof, then approve or reject activation.</p>
        </div>

        <div className="border-b border-white/8 px-5 py-5">
          <div className="grid gap-3 xl:grid-cols-[1.4fr,0.8fr,0.8fr,0.6fr,auto,auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={filters.search ?? ''}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search user, email, tx hash, VIP..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </label>

            <select
              value={filters.status ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AdminLedgerQuery['status'] }))}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
            >
              <option value="">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filters.crypto ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, crypto: event.target.value }))}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
            >
              <option value="">All chains</option>
              <option value="USDT_ERC20">USDT ERC20</option>
              <option value="USDT_TRC20">USDT TRC20</option>
              <option value="USDT_BEP20">USDT BEP20</option>
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

            <Button
              variant="secondary"
              onClick={() => setQuery({ ...filters, page: 1 })}
            >
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
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">Loading deposits...</div>
          ) : deposits.length === 0 ? (
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">No deposit requests match the current filters.</div>
          ) : (
            deposits.map((deposit) => (
              <div key={deposit.id} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">{formatCurrency(deposit.amount)} {deposit.crypto}</p>
                    <p className="text-sm text-slate-400">
                      {deposit.username ?? deposit.email ?? 'Unknown user'} • {formatDate(deposit.createdAt, 'MMM d, p')}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {deposit.vipTierName ? <span className="rounded-full bg-white/5 px-3 py-2">VIP {deposit.vipTierName}</span> : null}
                      {deposit.txHash ? <span className="rounded-full bg-white/5 px-3 py-2">TX {deposit.txHash}</span> : null}
                    </div>
                  </div>
                  <Badge tone={deposit.status === 'approved' ? 'green' : deposit.status === 'rejected' ? 'red' : 'amber'}>
                    {deposit.status}
                  </Badge>
                </div>
                {deposit.status === 'pending' ? (
                  <div className="mt-4 flex gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border border-brand-green/20 bg-brand-green/10 text-emerald-300 hover:bg-brand-green/15"
                      onClick={() => void handleAction(deposit.id, 'approve')}
                      disabled={busyId === deposit.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void handleAction(deposit.id, 'reject')}
                      disabled={busyId === deposit.id}
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
