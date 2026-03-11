import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAdmin: boolean;
  hydrated: boolean;
  setSession: (token: string, refreshToken: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  refreshSession: () => Promise<string | null>;
  markHydrated: () => void;
}

const getBaseUrl = () => import.meta.env.VITE_API_URL || '';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAdmin: false,
      hydrated: false,
      setSession: (token, refreshToken, user) =>
        set({
          token,
          refreshToken,
          user,
          isAdmin: user.role === 'admin',
        }),
      updateUser: (user) => set({ user, isAdmin: user.role === 'admin' }),
      logout: () => set({ token: null, refreshToken: null, user: null, isAdmin: false }),
      refreshSession: async () => {
        const currentRefreshToken = get().refreshToken;

        if (!currentRefreshToken) {
          get().logout();
          return null;
        }

        try {
          const response = await axios.post<AuthResponse>(
            `${getBaseUrl()}/api/identity/auth/refresh`,
            { refreshToken: currentRefreshToken },
          );
          const { accessToken, refreshToken, user } = response.data;
          set({
            token: accessToken,
            refreshToken,
            user,
            isAdmin: user.role === 'admin',
          });
          return accessToken;
        } catch (_error) {
          get().logout();
          return null;
        }
      },
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'vip-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
