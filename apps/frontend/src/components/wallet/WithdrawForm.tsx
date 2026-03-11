import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface WithdrawFormProps {
  maxAmount: number;
  minAmount: number;
  feePercent: number;
  disabled?: boolean;
  onSubmit: (amount: number, walletAddress: string) => Promise<void>;
}

export const WithdrawForm = ({ maxAmount, minAmount, feePercent, disabled, onSubmit }: WithdrawFormProps) => {
  const [amount, setAmount] = useState(String(minAmount));
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const numericAmount = Number(amount);
  const feeAmount = Number.isFinite(numericAmount) ? Number(((numericAmount * feePercent) / 100).toFixed(2)) : 0;
  const netAmount = Number.isFinite(numericAmount) ? Number((numericAmount - feeAmount).toFixed(2)) : 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(numericAmount, walletAddress);
      setWalletAddress('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-4 rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] p-5 shadow-panel backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Withdraw</p>
          <h2 className="text-xl font-semibold text-white">Transfer to your wallet</h2>
        </div>
        <p className="text-sm text-slate-400">Max {maxAmount.toFixed(2)}</p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Amount (USDT)</span>
          <input
            type="number"
            min={minAmount}
            max={maxAmount}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Wallet address</span>
          <input
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            placeholder="Paste your BEP20 wallet address"
            className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
          />
        </label>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="flex items-center justify-between gap-4">
            <span>Requested amount</span>
            <span>{numericAmount.toFixed(2)} USDT</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span>Platform fee ({feePercent.toFixed(0)}%)</span>
            <span>-{feeAmount.toFixed(2)} USDT</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/10 pt-2 font-medium text-white">
            <span>You will receive</span>
            <span>{netAmount.toFixed(2)} USDT</span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={disabled || submitting || numericAmount < minAmount || numericAmount > maxAmount || !walletAddress}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Submitting...' : 'Request withdrawal'}
        </Button>
      </div>
    </div>
  );
};
