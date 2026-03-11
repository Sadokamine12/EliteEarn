import { useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { CreateTaskDto, Task, VIPTier } from '@/types';

const defaultForm = (): CreateTaskDto => ({
  vipTierId: '',
  title: '',
  description: '',
  type: 'rating',
  productName: '',
  productImageUrl: '',
  targetUrl: '',
  reward: 0,
  isActive: true,
});

export const TaskManagerPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tiers, setTiers] = useState<VIPTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateTaskDto>(defaultForm());

  const tierMap = useMemo(
    () => new Map(tiers.map((tier) => [tier.id, tier.name])),
    [tiers],
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksResponse, tiersResponse] = await Promise.all([
        adminApi.getTasks(),
        adminApi.getVipTiers(),
      ]);
      setTasks(tasksResponse.data);
      setTiers(tiersResponse.data.filter((tier) => tier.isActive));
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreate = () => {
    setEditingTask(null);
    setForm((current) => ({
      ...defaultForm(),
      vipTierId: tiers[0]?.id ?? current.vipTierId,
    }));
    setIsModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      vipTierId: task.vipTierId,
      title: task.title,
      description: task.description ?? '',
      type: task.type,
      productName: task.productName ?? '',
      productImageUrl: task.productImageUrl ?? '',
      targetUrl: task.targetUrl ?? '',
      reward: task.reward ?? 0,
      isActive: task.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || undefined,
        productName: form.productName || undefined,
        productImageUrl: form.productImageUrl || undefined,
        targetUrl: form.targetUrl || undefined,
        reward: form.reward === null ? undefined : Number(form.reward),
      };

      if (editingTask) {
        await adminApi.updateTask(editingTask.id, payload);
        toast.success('Task updated');
      } else {
        await adminApi.createTask(payload);
        toast.success('Task created');
      }

      closeModal();
      await loadData();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (task: Task) => {
    setBusyId(task.id);
    try {
      await adminApi.deleteTask(task.id);
      toast.success('Task deactivated');
      await loadData();
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
            <p className="text-sm uppercase tracking-[0.24em] text-brand-orange">Tasks</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Task catalog</h1>
            <p className="mt-2 text-sm text-slate-400">Create, edit, and deactivate the live app-rating catalog used by the reward engine.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => void loadData()} disabled={isLoading}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreate} disabled={tiers.length === 0}>
              <Plus className="h-4 w-4" />
              New task
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-white/8 px-5 py-4">
            <h2 className="text-xl font-semibold text-white">Live tasks</h2>
            <p className="mt-1 text-sm text-slate-400">All task rows come directly from the `task-service` admin endpoints.</p>
          </div>

          <div className="space-y-3 p-5">
            {isLoading ? (
              <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-slate-400">No tasks found.</div>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="amber">{task.type}</Badge>
                        <Badge tone={(task.isActive ?? true) ? 'green' : 'red'}>
                          {(task.isActive ?? true) ? 'active' : 'inactive'}
                        </Badge>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {tierMap.get(task.vipTierId) ?? task.vipTierId}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                        {task.description ? <p className="mt-1 text-sm text-slate-400">{task.description}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                        <span className="rounded-full bg-white/5 px-3 py-2">Reward {formatCurrency(task.reward ?? 0)}</span>
                        {task.productName ? <span className="rounded-full bg-white/5 px-3 py-2">App {task.productName}</span> : null}
                        {task.targetUrl ? <span className="rounded-full bg-white/5 px-3 py-2">App link attached</span> : null}
                        {task.createdAt ? <span className="rounded-full bg-white/5 px-3 py-2">Created {formatDate(task.createdAt, 'MMM d')}</span> : null}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(task)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      {task.isActive !== false ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void handleDeactivate(task)}
                          disabled={busyId === task.id}
                        >
                          <Power className="h-4 w-4" />
                          Deactivate
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? `Edit ${editingTask.title}` : 'Create task'}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
                placeholder="Rate the WhatsApp app"
              />
            </Field>
            <Field label="VIP tier">
              <select
                value={form.vipTierId}
                onChange={(event) => setForm((current) => ({ ...current, vipTierId: event.target.value }))}
                className="w-full rounded-[24px] border border-white/10 bg-bg-secondary px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              >
                <option value="" disabled>Select tier</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CreateTaskDto['type'] }))}
                className="w-full rounded-[24px] border border-white/10 bg-bg-secondary px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              >
                <option value="rating">App rating</option>
                <option value="review">App review</option>
                <option value="survey">Survey</option>
                <option value="ad">Ad</option>
              </select>
            </Field>
            <Field label="Reward">
              <input
                type="number"
                min="0"
                step="0.0001"
                value={form.reward ?? 0}
                onChange={(event) => setForm((current) => ({ ...current, reward: Number(event.target.value) }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              />
            </Field>
            <Field label="App name">
              <input
                value={form.productName ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
                placeholder="WhatsApp"
              />
            </Field>
            <Field label="Image URL">
              <input
                value={form.productImageUrl ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, productImageUrl: event.target.value }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
                placeholder="https://..."
              />
            </Field>
            <Field label="App link">
              <input
                value={form.targetUrl ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, targetUrl: event.target.value }))}
                className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
                placeholder="https://apps.apple.com/... or https://play.google.com/..."
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan/40"
              placeholder="Describe the app-rating action the user should complete."
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

          <div className="flex gap-3">
            <Button onClick={() => void handleSubmit()} disabled={!form.title || !form.vipTierId || isSaving}>
              {editingTask ? 'Save changes' : 'Create task'}
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
