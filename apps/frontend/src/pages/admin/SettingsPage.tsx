import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/utils';
import type { PlatformSetting } from '@/types';

export const SettingsPage = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((response) => setSettings(response.data))
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, []);

  const payload = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
    [settings],
  );
  const generalSettings = useMemo(
    () => settings.filter((setting) => !['withdrawal_interval_days', 'withdrawal_fee_percent', 'withdrawal_processing_hours'].includes(setting.key)),
    [settings],
  );

  const saveSettings = async () => {
    try {
      await adminApi.updateSettings(payload);
      toast.success('Settings updated');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const upsertSetting = (key: string, value: string) => {
    setSettings((current) => {
      const existing = current.find((setting) => setting.key === key);
      if (existing) {
        return current.map((setting) => (setting.key === key ? { ...setting, value } : setting));
      }

      return [...current, { key, value }];
    });
  };

  const withdrawalIntervalValue =
    settings.find((setting) => setting.key === 'withdrawal_interval_days')?.value ?? '30';
  const withdrawalFeePercentValue =
    settings.find((setting) => setting.key === 'withdrawal_fee_percent')?.value ?? '20';
  const withdrawalProcessingHoursValue =
    settings.find((setting) => setting.key === 'withdrawal_processing_hours')?.value ?? '72';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card className="p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Withdrawal rules</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Withdrawal cooldown (days)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={withdrawalIntervalValue}
                onChange={(event) => upsertSetting('withdrawal_interval_days', event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
              />
              <p className="mt-2 text-xs text-slate-500">
                Example: `30` means one withdrawal every month. `60` means one withdrawal every two months. `0` disables the cooldown.
              </p>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Withdrawal fee percent</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={withdrawalFeePercentValue}
                onChange={(event) => upsertSetting('withdrawal_fee_percent', event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
              />
              <p className="mt-2 text-xs text-slate-500">
                Example: `20` means the platform keeps 20% and pays out 80% net.
              </p>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Withdrawal processing time (hours)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={withdrawalProcessingHoursValue}
                onChange={(event) => upsertSetting('withdrawal_processing_hours', event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
              />
              <p className="mt-2 text-xs text-slate-500">
                Example: `72` means withdrawals are reviewed and approved within 72 hours.
              </p>
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Platform settings</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {generalSettings.map((setting) => {
              const index = settings.findIndex((item) => item.key === setting.key);
              return (
              <label key={setting.key} className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">{setting.key}</span>
                <input
                  value={setting.value}
                  onChange={(event) =>
                    setSettings((current) =>
                      current.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, value: event.target.value } : item,
                      ),
                    )
                  }
                  className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
                />
              </label>
              );
            })}
          </div>
          <Button className="mt-6" onClick={() => void saveSettings()}>
            Save settings
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
};
