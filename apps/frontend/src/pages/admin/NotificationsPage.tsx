import { type FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/utils';

export const NotificationsPage = () => {
  const [draft, setDraft] = useState({ title: '', message: '', type: 'broadcast' });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await adminApi.broadcast(draft);
      toast.success('Broadcast queued');
      setDraft({ title: '', message: '', type: 'broadcast' });
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  return (
    <AdminLayout>
      <Card className="max-w-3xl p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">Broadcast</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Send a platform notice</h2>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Reward window extended" className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40" />
          <textarea value={draft.message} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} placeholder="Write the notification body" rows={6} className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40" />
          <Button type="submit">Send broadcast</Button>
        </form>
      </Card>
    </AdminLayout>
  );
};
