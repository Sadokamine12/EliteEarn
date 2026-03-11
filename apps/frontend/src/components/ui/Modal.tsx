import type { PropsWithChildren } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, className, children }: ModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-md sm:items-center">
      <div className={cn('w-full max-w-lg rounded-[28px] border border-white/10 bg-bg-secondary p-6 shadow-panel', className)}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            {title ? <h3 className="text-xl font-semibold text-white">{title}</h3> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
