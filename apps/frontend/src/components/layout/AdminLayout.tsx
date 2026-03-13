import { useEffect, useState, type PropsWithChildren } from 'react';
import { BellRing, BriefcaseBusiness, Gauge, ListTodo, Megaphone, Menu, Settings, ShieldCheck, Wallet, Workflow, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { label: 'Overview', path: '/admin', icon: Gauge },
  { label: 'Users', path: '/admin/users', icon: ShieldCheck },
  { label: 'Deposits', path: '/admin/deposits', icon: Wallet },
  { label: 'Withdrawals', path: '/admin/withdrawals', icon: BriefcaseBusiness },
  { label: 'VIP', path: '/admin/vip', icon: Workflow },
  { label: 'Tasks', path: '/admin/tasks', icon: ListTodo },
  { label: 'Promotions', path: '/admin/promotions', icon: Megaphone },
  { label: 'Notifications', path: '/admin/notifications', icon: BellRing },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export const AdminLayout = ({ children }: PropsWithChildren) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg-primary bg-mesh text-white">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin menu overlay"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 h-full w-[min(86vw,320px)] border-r border-white/8 bg-slate-950/95 p-5 shadow-panel backdrop-blur-xl">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">EliteEarn</p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Admin control</h1>
                <p className="mt-2 text-sm text-slate-400">Operate deposits, rewards, and platform risk from one place.</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white',
                      active && 'bg-white/10 text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </aside>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[32px] border border-white/8 bg-slate-950/70 p-5 shadow-panel backdrop-blur-xl lg:block">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">EliteEarn</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Admin control</h1>
            <p className="mt-2 text-sm text-slate-400">Operate deposits, rewards, and platform risk from one place.</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white',
                    active && 'bg-white/10 text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 rounded-[32px] border border-white/8 bg-slate-950/60 p-4 shadow-panel backdrop-blur-xl lg:p-6">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-brand-cyan">Back office</p>
              <h2 className="text-2xl font-semibold text-white">{user?.username ?? 'Administrator'}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              >
                <Menu className="h-4 w-4" />
                Menu
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
