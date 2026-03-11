import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-card border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] shadow-panel backdrop-blur-xl',
      className,
    )}
    {...props}
  />
);
