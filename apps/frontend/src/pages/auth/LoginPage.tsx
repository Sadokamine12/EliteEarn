import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await authApi.login(form);
      setSession(response.data.accessToken, response.data.refreshToken, response.data.user);
      toast.success('Logged in');
      const nextPath = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname;
      navigate(response.data.user.role === 'admin' ? nextPath ?? '/admin' : nextPath ?? '/', { replace: true });
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary bg-mesh px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-between gap-10 lg:flex-row lg:items-center">
        <div className="max-w-xl animate-riseIn">
          <p className="text-sm uppercase tracking-[0.4em] text-brand-orange">EliteEarn VIP</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-white">
            Run your rewards desk from a sharper mobile-first control room.
          </h1>
          <p className="mt-5 text-lg text-slate-300">
            Deposit, activate VIP, clear tasks, and watch balance events arrive live without leaving the dashboard rhythm.
          </p>
        </div>

        <Card className="w-full max-w-md p-6 animate-riseIn">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan">Welcome back</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Sign in</h2>
          <p className="mt-2 text-sm text-slate-400">Use your email or username plus the password from registration.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email or username</span>
              <input
                value={form.identifier}
                onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
                placeholder="jane@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
                placeholder="Minimum 8 characters"
              />
            </label>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Enter dashboard'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-medium text-brand-yellow transition hover:text-amber-200">
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
