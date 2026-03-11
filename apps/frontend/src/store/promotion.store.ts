import { create } from 'zustand';
import type { Promotion } from '@/types';

interface PromotionStore {
  activePromotion: Promotion | null;
  fetchPromotion: () => Promise<void>;
}

const getEnvPromotion = (): Promotion | null => {
  const endsAt = import.meta.env.VITE_PROMO_ENDS_AT;

  if (!endsAt) {
    return null;
  }

  return {
    id: 'bonus-week',
    title: '100% Bonus Week',
    subtitle: 'Double your daily earnings while the promo is live.',
    type: 'bonus_week',
    multiplier: 2,
    isActive: true,
    endsAt,
  };
};

export const usePromotionStore = create<PromotionStore>((set) => ({
  activePromotion: getEnvPromotion(),
  fetchPromotion: async () => {
    set({ activePromotion: getEnvPromotion() });
  },
}));
