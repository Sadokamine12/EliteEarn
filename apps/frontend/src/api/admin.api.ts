import api from './axios';
import type {
  AdminLedgerQuery,
  AdminStats,
  CreateTaskDto,
  CreateVipTierDto,
  Deposit,
  Notification,
  PaginatedResponse,
  PlatformSetting,
  Promotion,
  Subscription,
  Task,
  UpdateTaskDto,
  UpdateVipTierDto,
  User,
  VIPTier,
  Withdrawal,
} from '@/types';

const sanitizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  );
};

export const adminApi = {
  getStats: () => api.get<AdminStats>('/api/admin/admin/stats'),
  getUsers: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<User>>('/api/identity/users', { params }),
  updateUserStatus: (id: string, status: 'active' | 'banned') =>
    api.patch<User>(`/api/identity/users/${id}/status`, { status }),
  adjustUserBalance: (
    id: string,
    data: {
      field: 'available' | 'pending' | 'total_earned' | 'this_month';
      operation: 'credit' | 'debit' | 'set';
      amount: number;
    },
  ) => api.patch<User>(`/api/identity/users/${id}/balance`, data),
  getDeposits: (params?: AdminLedgerQuery) =>
    api.get<PaginatedResponse<Deposit>>('/api/admin/admin/deposits', { params: sanitizeParams(params) }),
  approveDeposit: (id: string) => api.patch<Deposit>(`/api/wallet/deposits/${id}/approve`),
  rejectDeposit: (id: string) => api.patch<Deposit>(`/api/wallet/deposits/${id}/reject`),
  getWithdrawals: (params?: AdminLedgerQuery) =>
    api.get<PaginatedResponse<Withdrawal>>('/api/admin/admin/withdrawals', { params: sanitizeParams(params) }),
  approveWithdrawal: (id: string) => api.patch<Withdrawal>(`/api/wallet/withdrawals/${id}/approve`),
  rejectWithdrawal: (id: string) => api.patch<Withdrawal>(`/api/wallet/withdrawals/${id}/reject`),
  getPromotions: () => api.get<Promotion[]>('/api/admin/admin/promotions'),
  createPromotion: (data: Partial<Promotion>) => api.post<Promotion>('/api/admin/admin/promotions', data),
  updatePromotion: (id: string, data: Partial<Promotion>) =>
    api.patch<Promotion>(`/api/admin/admin/promotions/${id}`, data),
  getSettings: () => api.get<PlatformSetting[]>('/api/admin/admin/settings'),
  updateSettings: (data: Record<string, string>) => api.patch('/api/admin/admin/settings', data),
  broadcast: (data: Partial<Notification>) => api.post('/api/admin/admin/broadcast', data),
  getVipTiers: () => api.get<VIPTier[]>('/api/vip/vip-tiers/admin/all'),
  createVipTier: (data: CreateVipTierDto) => api.post<VIPTier>('/api/vip/vip-tiers', data),
  updateVipTier: (id: string, data: UpdateVipTierDto) => api.patch<VIPTier>(`/api/vip/vip-tiers/${id}`, data),
  deleteVipTier: (id: string) => api.delete<VIPTier>(`/api/vip/vip-tiers/${id}`),
  getSubscriptions: () => api.get<Subscription[]>('/api/vip/subscriptions'),
  getTasks: () => api.get<Task[]>('/api/tasks/tasks'),
  createTask: (data: CreateTaskDto) => api.post<Task>('/api/tasks/tasks', data),
  updateTask: (id: string, data: UpdateTaskDto) => api.patch<Task>(`/api/tasks/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete<Task>(`/api/tasks/tasks/${id}`),
};
