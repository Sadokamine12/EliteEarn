import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/api/identity/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = useAuthStore.getState().refreshSession().finally(() => {
        refreshPromise = null;
      });
    }

    const nextToken = await refreshPromise;

    if (!nextToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${nextToken}`;
    return api(originalRequest);
  },
);

export default api;
