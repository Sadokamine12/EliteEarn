import { useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { extractErrorMessage, formatCurrency } from '@/lib/utils';
import type { CreateVipTierDto, VIPTier } from '@/types';

const defaultForm = (): CreateVipTierDto => ({
  name: '',
  slug: '',
  price: 10,
  dailyEarnings: 0.5,
  dailyTasksCount: 3,
  durationDays: 30,
  isActive: true,
  sortOrder: 0,
});

export const VIPManagerPage = () => {
  const [tiers, setTiers] = useState<VIPTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<VIPTier | null>(null);
  const [form, setForm] = useState<CreateVipTierDto>(defaultForm());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeCount = useMemo(() => tiers.filter((tier) => tier.isActive).length, [tiers]);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getVipTiers();
      setTiers(response.data);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTiers();
  }, []);

  const openCreate = () => {
    setForm(defaultForm());
    setEditingTier(null);
    setIsCreateOpen(true);
  };

  const openEdit = (tier: VIPTier) => {
    setForm({
      name: tier.name,
      slug: tier.slug,
      price: tier.price,
      dailyEarnings: tier.dailyEarnings,
      dailyTasksCount: tier.dailyTasksCount,
      durationDays: tier.durationDays,
      isActive: tier.isActive,
      sortOrder: tier.sortOrder,
    });
    setEditingTier(tier);
    setIsCreateOpen(true);
  };

  const closeModal = () => {
    setIsCreateOpen(false);
    setEditingTier(null);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (editingTier) {
        await adminApi.updateVipTier(editingTier.id, form);
        toast.success('VIP tier updated');
      } else {
        await adminApi.createVipTier(form);
        toast.success('VIP tier created');
      }
      closeModal();
      await loadTiers();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (tier: VIPTier) => {
    setBusyId(tier.id);
    try {
      await adminApi.deleteVipTier(tier.id);
      toast.success(`${tier.name} deactivated`);
      await loadTiers();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-brand-orange">VIP tiers</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Tier catalog</h1>
            <p className="mt-2 text-sm text-slate-400">{activeCount} active tiers across the live catalog.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => void loadTiers()} disabled={isLoading}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New tier
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <Card className="p-5 text-sm text-slate-400">Loading VIP tiers...</Card>
          ) : tiers.length === 0 ? (
            <Card className="p-5 text-sm text-slate-400">No VIP tiers available.</Card>
          ) : (
            tiers.map((tier) => (
              <Card key={tier.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm uppercase tracking-[0.2em] text-brand-orange">{tier.slug}</p>
                      <Badge tone={tier.isActive ? 'green' : 'red'}>{tier.isActive ? 'active' : 'inactive'}</Badge>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{tier.name}</h2>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">Sort order {tier.sortOrder}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-300">
                  <div className="flex justify-between rounded-3xl bg-white/5 px-4 py-3"><span>Price</span><strong className="text-white">{formatCurrency(tier.price)}</strong></div>
                  <div className="flex justify-between rounded-3xl bg-white/5 px-4 py-3"><span>Daily earnings</span><strong className="text-white">{formatCurrency(tier.dailyEarnings)}</strong></div>
                  <div className="flex justify-between rounded-3xl bg-white/5 px-4 py-3"><span>Tasks per day</span><strong className="text-white">{tier.dailyTasksCount}</strong></div>
                  <div className="flex justify-between rounded-3xl bg-white/5 px-4 py-3"><span>Duration</span><strong className="text-white">{tier.durationDays} days</strong></div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(tier)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  {tier.isActive ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void handleDeactivate(tier)}
                      disabled={busyId === tier.id}
                    >
                      <Power className="h-4 w-4" />
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={closeModal}
        title={editingTier ? `Edit ${editingTier.name}` : 'Create VIP tier'}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tier name">
              <input
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug: editingTier ? current.slug : slugify(name),
                  }));
                }}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
                placeholder="VIP Elite"
              />
            </Field>
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
                placeholder="vip_elite"
              />
            </Field>
            <Field label="Price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </Field>
            <Field label="Daily earnings">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.dailyEarnings}
                onChange={(event) => setForm((current) => ({ ...current, dailyEarnings: Number(event.target.value) }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </Field>
            <Field label="Tasks per day">
              <input
                type="number"
                min="1"
                step="1"
                value={form.dailyTasksCount}
                onChange={(event) => setForm((current) => ({ ...current, dailyTasksCount: Number(event.target.value) }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </Field>
            <Field label="Duration days">
              <input
                type="number"
                min="1"
                step="1"
                value={form.durationDays ?? 30}
                onChange={(event) => setForm((current) => ({ ...current, durationDays: Number(event.target.value) }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                min="0"
                step="1"
                value={form.sortOrder ?? 0}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </Field>
            <label className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              Active
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-white/10 bg-transparent"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => void handleSubmit()}
              disabled={!form.name || !form.slug || !form.price || !form.dailyTasksCount || isSaving}
            >
              {editingTier ? 'Save changes' : 'Create tier'}
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="space-y-2 text-sm text-slate-300">
    <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span>
    {children}
  </label>
);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
