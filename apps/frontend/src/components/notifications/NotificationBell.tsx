import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  unreadCount: number;
  active?: boolean;
  onClick: () => void;
}

export const NotificationBell = ({ unreadCount, active, onClick }: NotificationBellProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10 hover:text-white',
      active && 'border-brand-orange/30 bg-brand-orange/10 text-brand-yellow',
    )}
    aria-label="Notifications"
  >
    <Bell className="h-5 w-5" />
    {unreadCount > 0 ? (
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    ) : null}
  </button>
);
