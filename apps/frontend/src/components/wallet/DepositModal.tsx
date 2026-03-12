import { useEffect, useState } from 'react';
import { Coins, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useWalletStore } from '@/store/wallet.store';
import { useVipStore } from '@/store/vip.store';
import type { VIPTier } from '@/types';

interface DepositModalProps {
  isOpen: boolean;
  vipTier?: VIPTier | null;
  onClose: () => void;
}

export const DepositModal = ({ isOpen, vipTier, onClose }: DepositModalProps) => {
  const createDeposit = useWalletStore((state) => state.createDeposit);
  const activateVipFromBalance = useWalletStore((state) => state.activateVipFromBalance);
  const depositWallets = useWalletStore((state) => state.depositWallets);
  const balance = useWalletStore((state) => state.balance);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);
  const fetchHistory = useWalletStore((state) => state.fetchHistory);
  const fetchStoreData = useVipStore((state) => state.fetchStoreData);
  const [crypto, setCrypto] = useState<'USDT_ERC20' | 'USDT_TRC20' | 'USDT_BEP20'>('USDT_BEP20');
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const availableBalance = balance?.available ?? 0;
  const canActivateFromBalance = Boolean(vipTier) && availableBalance >= (vipTier?.price ?? 0);

  useEffect(() => {
    if (!isOpen) {
      setCrypto('USDT_BEP20');
      setTxHash('');
    }
  }, [isOpen]);

  const copyAddress = async (address?: string) => {
    if (!address) {
      toast.error('Address not configured');
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      toast.success('Deposit address copied');
    } catch {
      toast.error('Copy failed');
    }
  };

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
        vipTierId: vipTier.id,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleBalanceActivation = async () => {
    if (!vipTier) {
      return;
    }

    setSubmitting(true);
    try {
      await activateVipFromBalance(vipTier.id);
      await Promise.all([fetchBalance(), fetchHistory(), fetchStoreData()]);
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
            <p className="mt-2 text-sm text-slate-300">Available balance: {formatCurrency(availableBalance)}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Instant activation</p>
            <p className="mt-2 text-sm text-slate-300">
              If your account balance already covers this tier, you can activate it immediately without waiting for deposit verification.
            </p>
            <Button
              className="mt-4 w-full"
              size="lg"
              variant="secondary"
              onClick={() => void handleBalanceActivation()}
              disabled={submitting || !canActivateFromBalance}
            >
              {canActivateFromBalance
                ? `Activate with balance (${formatCurrency(availableBalance)})`
                : `Need ${formatCurrency(vipTier.price - availableBalance)} more in balance`}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(['USDT_ERC20', 'USDT_TRC20', 'USDT_BEP20'] as const).map((option) => (
              <div
                key={option}
                className={`rounded-3xl border px-4 py-4 text-left transition ${
                  crypto === option
                    ? 'border-brand-orange/40 bg-brand-orange/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setCrypto(option)} className="flex-1 text-left">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Network</p>
                    <p className="mt-1 font-semibold">{option.replace('USDT_', 'USDT ').replace('_', ' ')}</p>
                    <p className="mt-2 break-all text-xs text-slate-400">{depositWallets?.[option] || 'Address not configured'}</p>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => void copyAddress(depositWallets?.[option])}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
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
