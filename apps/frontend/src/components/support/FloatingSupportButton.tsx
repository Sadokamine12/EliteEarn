import { Headset } from 'lucide-react';

const TELEGRAM_SUPPORT_URL = 'https://t.me/EliteEarn2026';

export const FloatingSupportButton = () => (
  <a
    href={TELEGRAM_SUPPORT_URL}
    target="_blank"
    rel="noreferrer"
    aria-label="Open Telegram customer support"
    className="fixed bottom-24 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-cyan/25 bg-gradient-to-br from-brand-cyan to-brand-green text-slate-950 shadow-panel transition hover:scale-105 hover:brightness-110 lg:bottom-6 lg:right-6"
  >
    <Headset className="h-6 w-6" />
  </a>
);
