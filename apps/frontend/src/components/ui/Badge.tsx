import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'amber' | 'green' | 'red' | 'slate';
}

const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
  amber: 'bg-brand-orange/15 text-brand-yellow border-brand-orange/25',
  green: 'bg-brand-green/15 text-emerald-300 border-brand-green/25',
  red: 'bg-brand-red/15 text-rose-300 border-brand-red/25',
  slate: 'bg-white/10 text-slate-300 border-white/10',
};

export const Badge = ({ className, tone = 'slate', ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
      tones[tone],
      className,
    )}
    {...props}
  />
);
