import type { PropsWithChildren } from 'react';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

interface MobileLayoutProps extends PropsWithChildren {
  className?: string;
}

export const MobileLayout = ({ className, children }: MobileLayoutProps) => (
  <div className="min-h-screen bg-bg-primary bg-mesh px-3 py-4 text-white lg:px-6 lg:py-6">
    <div className="mx-auto w-full max-w-7xl lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
      <BottomNav desktop />
      <div className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-[430px] rounded-[36px] border border-[color:var(--panel-border)] bg-[color:var(--shell-bg)] shadow-panel backdrop-blur-xl lg:max-w-none lg:min-h-[calc(100vh-3rem)] lg:rounded-[32px]">
        <div className={cn('pb-28 lg:pb-8', className)}>{children}</div>
      </div>
    </div>
    <BottomNav />
  </div>
);
