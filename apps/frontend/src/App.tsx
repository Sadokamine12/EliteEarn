import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { FloatingSupportButton } from '@/components/support/FloatingSupportButton';
import { useBalance } from '@/hooks/useBalance';
import { useSocket } from '@/hooks/useSocket';
import { AppRouter } from '@/router/AppRouter';
import { useAuthStore } from '@/store/auth.store';

export default function App() {
  const token = useAuthStore((state) => state.token);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);

  useSocket();
  useBalance();

  useEffect(() => {
    const rawTheme = localStorage.getItem('eliteearn-theme');
    const theme = rawTheme === 'light' || rawTheme === 'jade' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    const themeColorMeta = document.querySelector("meta[name='theme-color']");
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'light' ? '#f4efe6' : '#0d1117');
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    authApi
      .getMe()
      .then((response) => updateUser(response.data))
      .catch(() => logout());
  }, [logout, token, updateUser]);

  return (
    <>
      <AppRouter />
      <FloatingSupportButton />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      />
    </>
  );
}
