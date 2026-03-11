const normalizeMultilineSecret = (value: string | undefined, label: string): string => {
  if (!value) {
    throw new Error(`${label} is required`);
  }

  return value.replace(/\\n/g, '\n');
};

export const getAccessPrivateKey = (): string =>
  normalizeMultilineSecret(process.env.JWT_ACCESS_PRIVATE_KEY, 'JWT_ACCESS_PRIVATE_KEY');

export const getAccessPublicKey = (): string =>
  normalizeMultilineSecret(process.env.JWT_ACCESS_PUBLIC_KEY, 'JWT_ACCESS_PUBLIC_KEY');

export const getRefreshPrivateKey = (): string =>
  normalizeMultilineSecret(process.env.JWT_REFRESH_PRIVATE_KEY, 'JWT_REFRESH_PRIVATE_KEY');

export const getRefreshPublicKey = (): string =>
  normalizeMultilineSecret(process.env.JWT_REFRESH_PUBLIC_KEY, 'JWT_REFRESH_PUBLIC_KEY');

export const getAccessExpiresIn = (): string => process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
export const getRefreshExpiresIn = (): string => process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
