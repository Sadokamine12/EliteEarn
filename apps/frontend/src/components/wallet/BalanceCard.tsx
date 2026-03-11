import { Wallet2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { Balance } from '@/types';

export const BalanceCard = ({ balance }: { balance: Balance | null }) => (
  <Card className="mx-4 overflow-hidden p-5">
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-brand-green">Wallet</p>
        <h2 className="text-3xl font-semibold text-white">{formatCurrency(balance?.available ?? 0)}</h2>
      </div>
      <div className="rounded-3xl bg-brand-green/15 p-3 text-brand-green">
        <Wallet2 className="h-6 w-6" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-3">
      <div className="rounded-2xl bg-white/5 px-3 py-3">
        <p className="text-slate-400">Pending</p>
        <p className="mt-1 font-semibold text-white">{formatCurrency(balance?.pending ?? 0)}</p>
      </div>
      <div className="rounded-2xl bg-white/5 px-3 py-3">
        <p className="text-slate-400">This month</p>
        <p className="mt-1 font-semibold text-white">{formatCurrency(balance?.thisMonth ?? 0)}</p>
      </div>
      <div className="rounded-2xl bg-white/5 px-3 py-3 sm:col-span-1 col-span-2">
        <p className="text-slate-400">Total earned</p>
        <p className="mt-1 font-semibold text-white">{formatCurrency(balance?.totalEarned ?? 0)}</p>
      </div>
    </div>
  </Card>
);
