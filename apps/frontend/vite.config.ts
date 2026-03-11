import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api/identity': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api\/identity/, ''),
      },
      '/api/wallet': {
        target: 'http://localhost:3002',
        rewrite: (path) => path.replace(/^\/api\/wallet/, ''),
      },
      '/api/vip': {
        target: 'http://localhost:3003',
        rewrite: (path) => path.replace(/^\/api\/vip/, ''),
      },
      '/api/tasks': {
        target: 'http://localhost:3004',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/notifications': {
        target: 'http://localhost:3005',
        rewrite: (path) => path.replace(/^\/api\/notifications/, ''),
      },
      '/api/admin': {
        target: 'http://localhost:3006',
        rewrite: (path) => path.replace(/^\/api\/admin/, ''),
      },
    },
  },
});
