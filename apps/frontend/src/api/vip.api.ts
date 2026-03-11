import api from './axios';
import type { Subscription, VIPTier } from '@/types';

export const vipApi = {
  getTiers: () => api.get<VIPTier[]>('/api/vip/vip-tiers'),
  getMySubscriptions: () => api.get<Subscription[]>('/api/vip/subscriptions/me'),
};
