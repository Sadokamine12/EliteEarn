import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { notificationApi } from '@/api/notification.api';
import { extractErrorMessage } from '@/lib/utils';
import type { Notification } from '@/types';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  panelOpen: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setPanelOpen: (value: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  panelOpen: false,
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const response = await notificationApi.getNotifications();
      set({ notifications: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(extractErrorMessage(error));
    }
  },
  fetchUnreadCount: async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      set({ unreadCount: response.data.count });
    } catch (_error) {
      set({ unreadCount: 0 });
    }
  },
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    })),
  markRead: async (id) => {
    try {
      await notificationApi.markRead(id);
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
        unreadCount: Math.max(
          0,
          state.unreadCount -
            (state.notifications.find((notification) => notification.id === id && !notification.isRead)
              ? 1
              : 0),
        ),
      }));
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  },
  markAllRead: async () => {
    try {
      await notificationApi.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  },
  setPanelOpen: (value) => set({ panelOpen: value }),
}));
