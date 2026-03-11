import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { vipApi } from '@/api/vip.api';
import { extractErrorMessage } from '@/lib/utils';
import type { Subscription, VIPTier } from '@/types';

interface VipStore {
  tiers: VIPTier[];
  subscriptions: Subscription[];
  loading: boolean;
  fetchStoreData: () => Promise<void>;
}

export const useVipStore = create<VipStore>((set) => ({
  tiers: [],
  subscriptions: [],
  loading: false,
  fetchStoreData: async () => {
    set({ loading: true });
    try {
      const [tiersResponse, subscriptionsResponse] = await Promise.all([
        vipApi.getTiers(),
        vipApi.getMySubscriptions(),
      ]);
      set({
        tiers: tiersResponse.data,
        subscriptions: subscriptionsResponse.data,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      toast.error(extractErrorMessage(error));
    }
  },
}));
