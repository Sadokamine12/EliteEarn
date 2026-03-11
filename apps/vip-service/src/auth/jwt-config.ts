const normalizeMultilineSecret = (value: string | undefined, label: string): string => {
  if (!value) {
    throw new Error(`${label} is required`);
  }

  return value.replace(/\\n/g, '\n');
};

export const getAccessPublicKey = (): string =>
  normalizeMultilineSecret(process.env.JWT_ACCESS_PUBLIC_KEY, 'JWT_ACCESS_PUBLIC_KEY');
