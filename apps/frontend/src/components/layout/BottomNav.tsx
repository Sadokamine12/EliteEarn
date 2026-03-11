import { ArrowDownToLine, ArrowUpFromLine, BriefcaseBusiness, LayoutGrid, LogOut, Newspaper, UserCircle2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const items = [
  { label: 'Home', icon: LayoutGrid, path: '/' },
  { label: 'Deposit', icon: ArrowDownToLine, path: '/deposit' },
  { label: 'Withdraw', icon: ArrowUpFromLine, path: '/withdraw' },
  { label: 'Store', icon: BriefcaseBusiness, path: '/store' },
  { label: 'News', icon: Newspaper, path: '/news' },
  { label: 'Profile', icon: UserCircle2, path: '/profile' },
];

interface BottomNavProps {
  desktop?: boolean;
}

export const BottomNav = ({ desktop = false }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (desktop) {
    return (
      <aside className="sticky top-6 hidden lg:block">
        <div className="rounded-[32px] border border-[color:var(--panel-border)] bg-[color:var(--shell-bg)] p-5 shadow-panel backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-orange">EliteEarn</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">User desk</h2>
            <p className="mt-2 text-sm text-slate-400">
              Move across wallet, tasks, store, and account flow without the mobile shell.
            </p>
          </div>

          <nav className="space-y-2">
            {items.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;

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
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Signed in</p>
            <p className="mt-2 text-lg font-semibold text-white">{user?.username ?? 'Operator'}</p>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="mt-4 w-full rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(calc(100vw-1.5rem),430px)] -translate-x-1/2 px-2 lg:hidden">
      <div className="grid grid-cols-7 gap-1 rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--shell-bg)] p-2 shadow-panel backdrop-blur-xl">
        {items.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-slate-400 transition',
                active && 'bg-white/10 text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
};
