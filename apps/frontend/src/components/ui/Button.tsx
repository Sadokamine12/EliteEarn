import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-r from-brand-orange via-amber-400 to-brand-yellow text-slate-950 shadow-glow hover:brightness-110',
  secondary:
    'border border-white/10 bg-white/8 text-white hover:bg-white/12',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/8 hover:text-white',
  danger: 'bg-brand-red/90 text-white hover:bg-brand-red',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(
  ({ className, variant = 'primary', size = 'md', type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
