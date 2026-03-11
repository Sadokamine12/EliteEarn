import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocketUrl = () => {
  return import.meta.env.VITE_WS_URL || null;
};

export const connectSocket = (token: string) => {
  const url = getSocketUrl();

  if (!url) {
    return null;
  }

  socket = io(url, {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
