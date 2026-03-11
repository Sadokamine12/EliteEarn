import api from './axios';
import type { AuthResponse, LoginDto, RegisterDto, UpdateProfileDto, User } from '@/types';

export const authApi = {
  register: (data: RegisterDto) => api.post<AuthResponse>('/api/identity/auth/register', data),
  login: (data: LoginDto) => api.post<AuthResponse>('/api/identity/auth/login', data),
  getMe: () => api.get<User>('/api/identity/users/me'),
  updateMe: (data: UpdateProfileDto) => api.patch<User>('/api/identity/users/me', data),
  claimWelcomeBonus: () =>
    api.post<{ amount: number; user: User }>('/api/identity/users/me/claim-welcome-bonus'),
};
