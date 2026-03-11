import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    referralCode: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await authApi.register({
        username: form.username,
        email: form.email,
        password: form.password,
        referralCode: form.referralCode.trim(),
      });
      setSession(response.data.accessToken, response.data.refreshToken, response.data.user);
      toast.success('Account created');
      navigate('/');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary bg-mesh px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-between gap-10 lg:flex-row lg:items-center">
        <Card className="w-full max-w-md p-6 animate-riseIn lg:order-2">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-orange">Start earning</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Create account</h2>
          <p className="mt-2 text-sm text-slate-400">A valid referral code is required before a new member can create an account.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Username</span>
              <input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
                placeholder="elite_runner"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
                placeholder="you@example.com"
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

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Referral code</span>
              <input
                value={form.referralCode}
                onChange={(event) => setForm((current) => ({ ...current, referralCode: event.target.value }))}
                required
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
                placeholder="Referral code required"
              />
            </label>

            <Button type="submit" size="lg" className="w-full" disabled={submitting || !form.referralCode.trim()}>
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-yellow transition hover:text-amber-200">
              Sign in
            </Link>
          </p>
        </Card>

        <div className="max-w-xl animate-riseIn lg:order-1">
          <div className="inline-flex rounded-full border border-brand-green/20 bg-brand-green/10 px-4 py-2 text-sm font-medium text-emerald-300">
            <Sparkles className="mr-2 h-4 w-4" />
            Claim 1 USDT after sign-up
          </div>
          <h1 className="mt-5 text-5xl font-semibold leading-tight text-white">
            Register once, then move through deposit, tasks, and payout without friction.
          </h1>
          <p className="mt-5 text-lg text-slate-300">
            The frontend mirrors the microservice stack so auth, wallet, VIP, tasks, and notifications stay separated but feel unified in the product.
          </p>
        </div>
      </div>
    </div>
  );
};
