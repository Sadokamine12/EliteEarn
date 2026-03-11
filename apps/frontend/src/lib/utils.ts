import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AxiosError } from 'axios';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (value = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const formatDate = (value?: string | Date | null, pattern = 'MMM d, yyyy p') => {
  if (!value) {
    return '--';
  }

  return format(new Date(value), pattern);
};

export const formatRelativeNumber = (value = 0) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export const extractErrorMessage = (error: unknown) => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'Something went wrong';
};
