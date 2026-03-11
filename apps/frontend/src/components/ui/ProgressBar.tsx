import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  label?: string;
}

export const ProgressBar = ({ value, className, label }: ProgressBarProps) => {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('space-y-2', className)}>
      {label ? <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div> : null}
      <div className="h-3 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-green via-emerald-300 to-brand-cyan transition-all duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};
