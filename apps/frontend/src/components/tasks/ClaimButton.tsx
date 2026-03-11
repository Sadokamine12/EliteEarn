import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

interface ClaimButtonProps {
  reward: number;
  onClaim: () => Promise<number>;
}

export const ClaimButton = ({ reward, onClaim }: ClaimButtonProps) => (
  <div className="sticky bottom-24 z-20 mx-4 mb-6 rounded-[28px] border border-brand-orange/20 bg-gradient-to-r from-brand-orange/20 via-amber-400/10 to-brand-green/15 p-4 shadow-glow backdrop-blur-xl">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Ready to collect</p>
        <p className="text-2xl font-semibold text-white">{formatCurrency(reward)}</p>
      </div>
      <div className="rounded-2xl bg-white/10 p-3 text-brand-yellow animate-pulseSoft">
        <Gift className="h-6 w-6" />
      </div>
    </div>
    <Button className="w-full" size="lg" onClick={() => void onClaim()}>
      Claim reward
    </Button>
  </div>
);
