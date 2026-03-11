import { type FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage, formatDate } from '@/lib/utils';
import type { Promotion } from '@/types';

export const PromotionsPage = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [draft, setDraft] = useState({ title: '', subtitle: '', multiplier: '2', endsAt: '' });

  const loadPromotions = () => {
    adminApi
      .getPromotions()
      .then((response) => setPromotions(response.data))
      .catch((error) => toast.error(extractErrorMessage(error)));
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const createPromotion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await adminApi.createPromotion({
        title: draft.title,
        subtitle: draft.subtitle,
        multiplier: Number(draft.multiplier),
        type: 'bonus_week',
        isActive: true,
        endsAt: draft.endsAt,
      });
      toast.success('Promotion submitted');
      setDraft({ title: '', subtitle: '', multiplier: '2', endsAt: '' });
      loadPromotions();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  return (
    <AdminLayout>
      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        <Card className="p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">Create promotion</p>
          <form className="mt-5 space-y-4" onSubmit={createPromotion}>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="100% Bonus Week" className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40" />
            <textarea value={draft.subtitle} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Double daily earnings for all active VIPs." rows={4} className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40" />
            <div className="grid gap-4 md:grid-cols-2">
              <input value={draft.multiplier} onChange={(event) => setDraft((current) => ({ ...current, multiplier: event.target.value }))} placeholder="2" className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40" />
              <input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft((current) => ({ ...current, endsAt: event.target.value }))} className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-orange/40" />
            </div>
            <Button type="submit">Create promotion</Button>
          </form>
        </Card>

        <Card className="p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Active list</p>
          <div className="mt-5 space-y-3">
            {promotions.length === 0 ? (
              <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">No promotions configured.</div>
            ) : (
              promotions.map((promotion) => (
                <div key={promotion.id} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{promotion.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{promotion.subtitle}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                      x{promotion.multiplier}
                    </span>
                  </div>
                  {promotion.endsAt ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Ends {formatDate(promotion.endsAt, 'MMM d, yyyy p')}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};
