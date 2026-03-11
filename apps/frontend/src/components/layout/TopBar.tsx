import { useEffect, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';

const STORAGE_KEY = 'eliteearn-theme';
type ThemeMode = 'dark' | 'light';

export const TopBar = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const notifications = useNotificationStore((state) => state.notifications);
  const panelOpen = useNotificationStore((state) => state.panelOpen);
  const setPanelOpen = useNotificationStore((state) => state.setPanelOpen);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const rawTheme = localStorage.getItem(STORAGE_KEY);
    const storedTheme: ThemeMode =
      rawTheme === 'light' || rawTheme === 'jade'
        ? 'light'
        : 'dark';
    setTheme(storedTheme);
    document.documentElement.dataset.theme = storedTheme;
    void fetchNotifications();
    void fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(STORAGE_KEY, nextTheme);
    const themeColorMeta = document.querySelector("meta[name='theme-color']");
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', nextTheme === 'light' ? '#f4efe6' : '#0d1117');
    }
  };

  return (
    <div className="relative mb-6 flex items-center justify-between gap-3 px-4 pt-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">EliteEarn</p>
        <h1 className="text-lg font-semibold text-white">Welcome back, {user?.username ?? 'Operator'}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10 hover:text-white"
          aria-label="Toggle light theme"
        >
          {theme === 'dark' ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </button>

        <div className="relative">
          <NotificationBell
            unreadCount={unreadCount}
            active={panelOpen}
            onClick={() => setPanelOpen(!panelOpen)}
          />
          {panelOpen ? (
            <NotificationPanel
              notifications={notifications}
              onMarkAllRead={() => void markAllRead()}
              onMarkRead={(id) => void markRead(id)}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-brand-orange/30 to-brand-cyan/20 text-sm font-bold text-white"
          aria-label="Open profile settings"
        >
          {user?.username.slice(0, 2).toUpperCase() ?? 'EE'}
        </button>
      </div>
    </div>
  );
};
