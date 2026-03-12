export interface User {
  id: string;
  username: string;
  email: string;
  referralCode: string;
  referredBy: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'banned';
  welcomeBonusClaimed: boolean;
  createdAt: string;
  updatedAt: string;
  referralActivatedVip?: boolean;
  referralSummary?: {
    count: number;
    users: Array<{
      id: string;
      email: string;
      createdAt: string;
    }>;
    levels: Array<{
      level: 1 | 2 | 3;
      percent: number;
      totalMembers: number;
      activeMembers: number;
      totalEarned: number;
    }>;
  };
  balance?: {
    available: number;
    pending: number;
    totalEarned: number;
    thisMonth: number;
    updatedAt: string | null;
  };
}

export interface Balance {
  available: number;
  pending: number;
  totalEarned: number;
  thisMonth: number;
  updatedAt: string | null;
}

export interface Deposit {
  id: string;
  userId?: string;
  username?: string | null;
  email?: string | null;
  amount: number;
  crypto: 'USDT_ERC20' | 'USDT_TRC20' | 'USDT_BEP20';
  txHash?: string | null;
  proofUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  vipTierId?: string | null;
  vipTierName?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId?: string;
  username?: string | null;
  email?: string | null;
  amount: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
  walletAddress: string;
  crypto: 'USDT_BEP20' | 'BTC';
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface AdminLedgerQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'approved' | 'rejected' | '';
  crypto?: string;
}

export interface VIPTier {
  id: string;
  name: string;
  slug: string;
  price: number;
  dailyEarnings: number;
  dailyTasksCount: number;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  vipTierId: string;
  status: 'active' | 'expired' | 'cancelled';
  startedAt: string;
  expiresAt: string;
  dailyEarnings: number;
  tierName?: string;
}

export interface Task {
  id: string;
  vipTierId: string;
  title: string;
  description?: string;
  type: 'review' | 'rating' | 'survey' | 'ad';
  productName?: string;
  productImageUrl?: string;
  targetUrl?: string;
  reward: number | null;
  isActive?: boolean;
  createdAt?: string;
  completed?: boolean;
}

export interface TaskProgress {
  completed: number;
  total: number;
  percentage: number;
  canClaim: boolean;
  totalReward: number;
}

export interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle?: string | null;
  type: 'bonus_week' | 'banner' | 'wheel';
  multiplier: number;
  isActive: boolean;
  endsAt?: string | null;
  createdAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  activeSubscriptions: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
}

export interface PlatformSetting {
  key: string;
  value: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  referralCode: string;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

export interface UpdateProfileDto {
  username?: string;
  email?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CreateDepositDto {
  amount: number;
  crypto: 'USDT_ERC20' | 'USDT_TRC20' | 'USDT_BEP20';
  vipTierId?: string;
  txHash?: string;
  proofUrl?: string;
}

export interface DepositWallets {
  USDT_ERC20: string;
  USDT_TRC20: string;
  USDT_BEP20: string;
}

export interface BalanceActivationResponse {
  vipTierId: string;
  vipTierName: string;
  spentAmount: number;
  remainingBalance: number;
  subscriptionId: string;
  expiresAt: string;
}

export interface WithdrawDto {
  amount: number;
  walletAddress: string;
  crypto?: 'USDT_BEP20' | 'BTC';
}

export interface WithdrawalEligibility {
  hasVIP: boolean;
  usedReferral: boolean;
  referralActivatedVip: boolean;
  withdrawalFrequencyMet: boolean;
  withdrawalIntervalDays: number;
  withdrawalFeePercent: number;
  withdrawalProcessingHours: number;
  recentWithdrawalAt: string | null;
  nextWithdrawalAt: string | null;
  allMet: boolean;
}

export interface CompleteTaskDto {
  rating?: number;
  reviewText?: string;
}

export interface CreateVipTierDto {
  name: string;
  slug: string;
  price: number;
  dailyEarnings: number;
  dailyTasksCount: number;
  durationDays?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateVipTierDto extends Partial<CreateVipTierDto> {}

export interface CreateTaskDto {
  vipTierId: string;
  title: string;
  description?: string;
  type: 'review' | 'rating' | 'survey' | 'ad';
  productName?: string;
  productImageUrl?: string;
  targetUrl?: string;
  reward?: number | null;
  isActive?: boolean;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {}
