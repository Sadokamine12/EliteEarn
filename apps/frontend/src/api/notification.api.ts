import api from './axios';
import type { Notification } from '@/types';

export const notificationApi = {
  getNotifications: () => api.get<Notification[]>('/api/notifications/notifications'),
  getUnreadCount: () => api.get<{ count: number }>('/api/notifications/notifications/unread-count'),
  markAllRead: () => api.patch('/api/notifications/notifications/mark-all-read'),
  markRead: (id: string) => api.patch(`/api/notifications/notifications/${id}/read`),
};
