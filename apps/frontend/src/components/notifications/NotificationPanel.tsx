import { CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import type { Notification } from '@/types';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export const NotificationPanel = ({
  notifications,
  onMarkAllRead,
  onMarkRead,
}: NotificationPanelProps) => (
  <Card className="absolute right-0 top-14 z-40 w-[min(92vw,24rem)] p-3">
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-white">Alerts</p>
        <p className="text-xs text-slate-400">Latest account and platform activity</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
        <CheckCheck className="h-4 w-4" /> Mark all
      </Button>
    </div>

    <div className="space-y-2">
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
          No notifications yet.
        </div>
      ) : (
        notifications.slice(0, 6).map((notification) => (
          <button
            type="button"
            key={notification.id}
            onClick={() => onMarkRead(notification.id)}
            className="w-full rounded-2xl border border-white/6 bg-white/4 p-3 text-left transition hover:bg-white/8"
          >
            <div className="mb-1 flex items-center justify-between gap-4">
              <p className="font-medium text-white">{notification.title}</p>
              {!notification.isRead ? <span className="h-2.5 w-2.5 rounded-full bg-brand-orange" /> : null}
            </div>
            <p className="text-sm text-slate-300">{notification.message}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              {formatDate(notification.createdAt, 'MMM d, p')}
            </p>
          </button>
        ))
      )}
    </div>
  </Card>
);
