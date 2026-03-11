import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useWalletStore } from '@/store/wallet.store';
import type { VIPTier } from '@/types';

interface DepositModalProps {
  isOpen: boolean;
  vipTier?: VIPTier | null;
  onClose: () => void;
}

export const DepositModal = ({ isOpen, vipTier, onClose }: DepositModalProps) => {
  const createDeposit = useWalletStore((state) => state.createDeposit);
  const depositWallets = useWalletStore((state) => state.depositWallets);
  const [crypto, setCrypto] = useState<'USDT_ERC20' | 'USDT_TRC20' | 'USDT_BEP20'>('USDT_BEP20');
  const [txHash, setTxHash] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCrypto('USDT_BEP20');
      setTxHash('');
      setProofUrl('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!vipTier) {
      return;
    }

    setSubmitting(true);
    try {
      await createDeposit({
        amount: vipTier.price,
        crypto,
        txHash: txHash || undefined,
        proofUrl: proofUrl || undefined,
        vipTierId: vipTier.id,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit VIP deposit">
      {vipTier ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-brand-orange/20 bg-brand-orange/10 p-4">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Selected tier</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-2xl font-semibold text-white">{vipTier.name}</h4>
                <p className="text-sm text-slate-300">{vipTier.dailyTasksCount} tasks per day</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-3 text-brand-yellow">
                <Coins className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">{formatCurrency(vipTier.price)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(['USDT_ERC20', 'USDT_TRC20', 'USDT_BEP20'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCrypto(option)}
                className={`rounded-3xl border px-4 py-4 text-left transition ${
                  crypto === option
                    ? 'border-brand-orange/40 bg-brand-orange/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Network</p>
                <p className="mt-1 font-semibold">{option.replace('USDT_', 'USDT ').replace('_', ' ')}</p>
                <p className="mt-2 break-all text-xs text-slate-400">{depositWallets?.[option] || 'Address not configured'}</p>
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Transaction hash</span>
            <input
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              placeholder="Paste the blockchain transaction hash"
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Proof URL</span>
            <input
              value={proofUrl}
              onChange={(event) => setProofUrl(event.target.value)}
              placeholder="Optional screenshot or explorer link"
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-orange/40"
            />
          </label>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Your VIP will activate only after an admin verifies this transaction.
          </div>

          <Button className="w-full" size="lg" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit for verification'}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
};
