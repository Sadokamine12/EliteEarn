export const RABBITMQ_EXCHANGES = {
  DEPOSITS: 'deposits.exchange',
  TASKS: 'tasks.exchange',
  WALLETS: 'wallets.exchange',
  NOTIFS: 'notifications.exchange',
} as const;

export const RABBITMQ_QUEUES = {
  DEPOSIT_APPROVED: 'deposit.approved',
  DEPOSIT_REJECTED: 'deposit.rejected',
  TASK_COMPLETED: 'task.completed',
  REWARD_CLAIMED: 'reward.claimed',
  SUBSCRIPTION_CREATED: 'subscription.created',
  WITHDRAWAL_REQUESTED: 'withdrawal.requested',
  NOTIFY_USER: 'notify.user',
} as const;

export interface DepositApprovedEvent {
  depositId: string;
  userId: string;
  amount: number;
  vipTierId: string;
}

export interface TaskCompletedEvent {
  userId: string;
  taskId: string;
  subscriptionId: string;
  reward: number;
}

export interface RewardClaimedEvent {
  userId: string;
  subscriptionId: string;
  totalReward: number;
  date: string;
}

export interface NotifyUserEvent {
  userId: string | null;
  title: string;
  message: string;
  type: string;
}
