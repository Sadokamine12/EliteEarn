import { useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { formatDate } from '@/lib/utils';
import { useNotificationStore } from '@/store/notification.store';
import { usePromotionStore } from '@/store/promotion.store';

export const NewsPage = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const activePromotion = usePromotionStore((state) => state.activePromotion);
  const fetchPromotion = usePromotionStore((state) => state.fetchPromotion);

  useEffect(() => {
    void fetchNotifications();
    void fetchPromotion();
  }, [fetchNotifications, fetchPromotion]);

  return (
    <MobileLayout>
      <TopBar />
      <div className="space-y-5 px-4">
        <Card className="overflow-hidden bg-gradient-to-r from-brand-orange/20 via-transparent to-brand-cyan/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Newswire</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Platform announcements</h2>
              <p className="mt-2 text-sm text-slate-300">Ops updates, promo windows, and account events land here first.</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-3 text-brand-yellow">
              <Megaphone className="h-6 w-6" />
            </div>
          </div>
          {activePromotion ? (
            <div className="mt-5 rounded-3xl border border-white/8 bg-slate-950/35 p-4">
              <p className="font-semibold text-white">{activePromotion.title}</p>
              <p className="mt-1 text-sm text-slate-300">{activePromotion.subtitle}</p>
              <div className="mt-3">
                <CountdownTimer endsAt={activePromotion.endsAt} />
              </div>
            </div>
          ) : null}
        </Card>

        <div className="space-y-3 pb-6">
          {notifications.length === 0 ? (
            <Card className="p-6 text-sm text-slate-400">No announcement items yet.</Card>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-white">{notification.title}</p>
                  {!notification.isRead ? <span className="h-2.5 w-2.5 rounded-full bg-brand-orange" /> : null}
                </div>
                <p className="mt-2 text-sm text-slate-300">{notification.message}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {formatDate(notification.createdAt, 'MMM d, yyyy p')}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
};
