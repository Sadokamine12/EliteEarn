import { useCountdown } from '@/hooks/useCountdown';

export const CountdownTimer = ({ endsAt }: { endsAt?: string | null }) => {
  const { days, hours, minutes, seconds, expired } = useCountdown(endsAt);

  if (!endsAt || expired) {
    return <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Expired</span>;
  }

  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
      <span>{String(days).padStart(2, '0')}d</span>
      <span>{String(hours).padStart(2, '0')}h</span>
      <span>{String(minutes).padStart(2, '0')}m</span>
      <span>{String(seconds).padStart(2, '0')}s</span>
    </div>
  );
};
