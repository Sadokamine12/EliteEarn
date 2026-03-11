import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { useWalletStore } from '@/store/wallet.store';
import type { Notification } from '@/types';

export const useSocket = () => {
  const token = useAuthStore((state) => state.token);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const updateBalance = useWalletStore((state) => state.updateBalance);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = connectSocket(token);
    if (!socket) {
      return;
    }

    socket.on('notification', (notification: Notification) => {
      addNotification(notification);
      toast.success(notification.title);
    });

    socket.on('balance_update', (payload: { available: number }) => {
      updateBalance(payload.available);
    });

    return () => {
      disconnectSocket();
    };
  }, [addNotification, token, updateBalance]);
};
