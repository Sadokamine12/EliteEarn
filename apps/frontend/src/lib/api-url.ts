const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getGatewayBaseUrl = () => {
  const value = import.meta.env.VITE_API_URL;
  return value ? trimTrailingSlash(value) : '';
};

const getServiceBaseUrl = (service: string) => {
  const envMap: Record<string, string | undefined> = {
    identity: import.meta.env.VITE_IDENTITY_API_URL,
    wallet: import.meta.env.VITE_WALLET_API_URL,
    vip: import.meta.env.VITE_VIP_API_URL,
    tasks: import.meta.env.VITE_TASK_API_URL,
    notifications: import.meta.env.VITE_NOTIFICATIONS_API_URL,
    admin: import.meta.env.VITE_ADMIN_API_URL,
  };

  const value = envMap[service];
  return value ? trimTrailingSlash(value) : '';
};

const startsWithHttp = (value: string) => /^https?:\/\//i.test(value);

export const resolveApiUrl = (url: string) => {
  if (!url || startsWithHttp(url)) {
    return url;
  }

  const gatewayBaseUrl = getGatewayBaseUrl();
  if (gatewayBaseUrl) {
    return `${gatewayBaseUrl}${url}`;
  }

  const routes: Array<{ prefix: string; service: string; rewrite: (value: string) => string }> = [
    {
      prefix: '/api/identity',
      service: 'identity',
      rewrite: (value) => value.replace(/^\/api\/identity/, ''),
    },
    {
      prefix: '/api/wallet',
      service: 'wallet',
      rewrite: (value) => value.replace(/^\/api\/wallet/, ''),
    },
    {
      prefix: '/api/vip',
      service: 'vip',
      rewrite: (value) => value.replace(/^\/api\/vip/, ''),
    },
    {
      prefix: '/api/tasks',
      service: 'tasks',
      rewrite: (value) => value.replace(/^\/api/, ''),
    },
    {
      prefix: '/api/notifications',
      service: 'notifications',
      rewrite: (value) => value.replace(/^\/api\/notifications/, ''),
    },
    {
      prefix: '/api/admin',
      service: 'admin',
      rewrite: (value) => value.replace(/^\/api\/admin/, ''),
    },
  ];

  for (const route of routes) {
    if (url.startsWith(route.prefix)) {
      const serviceBaseUrl = getServiceBaseUrl(route.service);
      return serviceBaseUrl ? `${serviceBaseUrl}${route.rewrite(url)}` : url;
    }
  }

  return url;
};
