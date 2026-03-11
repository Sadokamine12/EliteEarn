import { useEffect, useMemo, useState } from 'react';

const getRemaining = (target: string | Date) => {
  const distance = new Date(target).getTime() - Date.now();
  const safeDistance = Math.max(distance, 0);

  return {
    expired: distance <= 0,
    total: safeDistance,
    days: Math.floor(safeDistance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((safeDistance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((safeDistance / (1000 * 60)) % 60),
    seconds: Math.floor((safeDistance / 1000) % 60),
  };
};

export const useCountdown = (target?: string | Date | null) => {
  const [remaining, setRemaining] = useState(() =>
    target ? getRemaining(target) : { expired: true, total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 },
  );

  useEffect(() => {
    if (!target) {
      setRemaining({ expired: true, total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    setRemaining(getRemaining(target));
    const timer = window.setInterval(() => {
      setRemaining(getRemaining(target));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [target]);

  return useMemo(() => remaining, [remaining]);
};
