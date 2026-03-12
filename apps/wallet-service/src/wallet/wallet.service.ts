import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '@app/database';
import { applyReferralCommissions } from '@app/common';
import {
  DepositApprovedEvent,
  NotifyUserEvent,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RabbitMqService,
  RewardClaimedEvent,
} from '@app/rabbitmq';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

interface BalanceRow {
  available: string;
  pending: string;
  total_earned: string;
  this_month: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  referral_code: string;
  referred_by: string | null;
}

interface RecentWithdrawalRow {
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface DepositRow {
  id: string;
  user_id: string;
  amount: string;
  crypto: 'USDT_ERC20' | 'USDT_TRC20' | 'USDT_BEP20';
  tx_hash: string | null;
  proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  vip_tier_id: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  username?: string | null;
  email?: string | null;
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: string;
  fee_percent: string;
  fee_amount: string;
  net_amount: string;
  wallet_address: string;
  crypto: 'USDT_BEP20' | 'BTC';
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  username?: string | null;
  email?: string | null;
}

interface VipTierRow {
  id: string;
  name: string;
  price: string;
  slug?: string;
  daily_earnings?: string;
  duration_days?: number;
  sort_order?: number;
}

interface TransactionHistoryRow {
  id: string;
  type: 'deposit' | 'withdrawal' | 'reward';
  amount: string;
  status: string;
  crypto: string | null;
  reference: string | null;
  created_at: string;
}

interface RowQueryExecutor {
  query<T = unknown>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  async getBalance(userId: string) {
    const balance = await this.ensureBalance(userId);
    return this.toBalanceResponse(balance);
  }

  async getBalanceHistory(userId: string) {
    const result = await this.databaseService.query<TransactionHistoryRow>(
      `
        SELECT id, type, amount, status, crypto, reference, created_at
        FROM (
          SELECT
            d.id,
            'deposit'::TEXT AS type,
            d.amount::TEXT AS amount,
            d.status::TEXT AS status,
            d.crypto::TEXT AS crypto,
            COALESCE(d.tx_hash, d.proof_url) AS reference,
            d.created_at
          FROM deposits d
          WHERE d.user_id = $1

          UNION ALL

          SELECT
            w.id,
            'withdrawal'::TEXT AS type,
            w.amount::TEXT AS amount,
            w.status::TEXT AS status,
            w.crypto::TEXT AS crypto,
            w.wallet_address AS reference,
            w.created_at
          FROM withdrawals w
          WHERE w.user_id = $1

          UNION ALL

          SELECT
            r.id,
            'reward'::TEXT AS type,
            r.amount::TEXT AS amount,
            'credited'::TEXT AS status,
            NULL::TEXT AS crypto,
            r.subscription_id::TEXT AS reference,
            r.created_at
          FROM reward_claims r
          WHERE r.user_id = $1
        ) AS history
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      status: row.status,
      crypto: row.crypto,
      reference: row.reference,
      createdAt: row.created_at,
    }));
  }

  async createDeposit(userId: string, dto: CreateDepositDto) {
    const minDeposit = await this.getNumericSetting('min_deposit', 10);
    if (dto.amount < minDeposit) {
      throw new BadRequestException(`Minimum deposit is ${minDeposit.toFixed(2)}`);
    }

    const tier = await this.getVipTier(dto.vipTierId);
    await this.assertVipTierCanBeActivated(userId, dto.vipTierId, tier.name);
    const highestActiveTier = await this.getHighestActiveTier(userId);

    if (
      highestActiveTier &&
      Number(tier.sort_order ?? 0) < Number(highestActiveTier.sort_order ?? 0)
    ) {
      throw new BadRequestException(
        `Downgrade is not allowed. Your current highest tier is ${highestActiveTier.name}. Activate that tier or a higher one.`,
      );
    }

    if (dto.amount !== Number(tier.price)) {
      throw new BadRequestException(
        `Deposit amount must match ${tier.name} price of ${Number(tier.price).toFixed(2)}`,
      );
    }

    const result = await this.databaseService.query<DepositRow>(
      `
        INSERT INTO deposits (
          user_id,
          amount,
          crypto,
          tx_hash,
          proof_url,
          vip_tier_id,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
      `,
      [userId, dto.amount.toFixed(2), dto.crypto, dto.txHash ?? null, dto.proofUrl ?? null, dto.vipTierId],
    );

    return this.toDepositResponse(result.rows[0]);
  }

  async activateVipFromBalance(userId: string, vipTierId: string) {
    const tier = await this.getVipTier(vipTierId);
    await this.assertVipTierCanBeActivated(userId, vipTierId, tier.name);
    const highestActiveTier = await this.getHighestActiveTier(userId);

    if (
      highestActiveTier &&
      Number(tier.sort_order ?? 0) < Number(highestActiveTier.sort_order ?? 0)
    ) {
      throw new BadRequestException(
        `Downgrade is not allowed. Your current highest tier is ${highestActiveTier.name}. Activate that tier or a higher one.`,
      );
    }

    const outcome = await this.databaseService.transaction(async (client) => {
      const balance = await this.ensureBalance(userId, client, true);
      const available = Number(balance.available);
      const tierPrice = Number(tier.price);

      if (available < tierPrice) {
        throw new BadRequestException(
          `Insufficient balance. ${tier.name} requires ${tierPrice.toFixed(2)} and your available balance is ${available.toFixed(2)}.`,
        );
      }

      await client.query(
        `
          UPDATE balances
          SET available = available - $2, updated_at = NOW()
          WHERE user_id = $1
        `,
        [userId, tierPrice.toFixed(2)],
      );

      const subscriptionResult = await client.query<{ id: string; expires_at: string }>(
        `
          INSERT INTO subscriptions (
            user_id,
            vip_tier_id,
            status,
            started_at,
            expires_at,
            daily_earnings
          )
          VALUES (
            $1,
            $2,
            'active',
            NOW(),
            NOW() + ($3 || ' days')::INTERVAL,
            $4
          )
          RETURNING id, expires_at
        `,
        [
          userId,
          vipTierId,
          tier.duration_days ?? 30,
          Number(tier.daily_earnings ?? 0).toFixed(2),
        ],
      );

      await applyReferralCommissions({
        executor: client,
        sourceUserId: userId,
        subscriptionId: subscriptionResult.rows[0].id,
        vipTierId,
        sourceAmount: tierPrice,
      });

      return {
        subscriptionId: subscriptionResult.rows[0].id,
        expiresAt: subscriptionResult.rows[0].expires_at,
        remainingBalance: available - tierPrice,
      };
    });

    await this.insertNotification(
      userId,
      'VIP Activated',
      `${tier.name} was activated using your wallet balance.`,
      'vip_activated',
    );

    return {
      vipTierId,
      vipTierName: tier.name,
      spentAmount: Number(tier.price),
      remainingBalance: outcome.remainingBalance,
      subscriptionId: outcome.subscriptionId,
      expiresAt: outcome.expiresAt,
    };
  }

  async getDepositWallets() {
    const result = await this.databaseService.query<{ key: string; value: string }>(
      `
        SELECT key, value
        FROM platform_settings
        WHERE key IN ('usdt_erc20_wallet', 'usdt_trc20_wallet', 'usdt_bep20_wallet')
      `,
    );

    const settings = Object.fromEntries(result.rows.map((row) => [row.key, row.value]));

    return {
      USDT_ERC20: settings.usdt_erc20_wallet ?? '',
      USDT_TRC20: settings.usdt_trc20_wallet ?? '',
      USDT_BEP20: settings.usdt_bep20_wallet ?? '',
    };
  }

  async getDeposits(userId: string) {
    const result = await this.databaseService.query<DepositRow>(
      `
        SELECT *
        FROM deposits
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => this.toDepositResponse(row));
  }

  async getPendingDeposits() {
    const result = await this.databaseService.query<DepositRow>(
      `
        SELECT d.*, u.username, u.email
        FROM deposits d
        JOIN users u ON u.id = d.user_id
        WHERE d.status = 'pending'
        ORDER BY d.created_at ASC
      `,
    );

    return result.rows.map((row) => this.toDepositResponse(row));
  }

  async approveDeposit(depositId: string, reviewerId: string) {
    const deposit = await this.databaseService.transaction(async (client) => {
      const currentDeposit = await this.lockDeposit(client, depositId);

      if (currentDeposit.status !== 'pending') {
        throw new BadRequestException('Deposit is no longer pending');
      }

      const updated = await client.query<DepositRow>(
        `
          UPDATE deposits
          SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [depositId, reviewerId],
      );

      return updated.rows[0];
    });

    const event: DepositApprovedEvent = {
      depositId: deposit.id,
      userId: deposit.user_id,
      amount: Number(deposit.amount),
      vipTierId: deposit.vip_tier_id,
    };
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.DEPOSITS,
      RABBITMQ_QUEUES.DEPOSIT_APPROVED,
      event,
    );

    if (!process.env.RABBITMQ_URL) {
      await this.applyLocalDepositApproval(event);
    }

    return this.toDepositResponse(deposit);
  }

  async rejectDeposit(depositId: string, reviewerId: string) {
    const deposit = await this.databaseService.transaction(async (client) => {
      const currentDeposit = await this.lockDeposit(client, depositId);

      if (currentDeposit.status !== 'pending') {
        throw new BadRequestException('Deposit is no longer pending');
      }

      const updated = await client.query<DepositRow>(
        `
          UPDATE deposits
          SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [depositId, reviewerId],
      );

      return updated.rows[0];
    });

    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.DEPOSITS,
      RABBITMQ_QUEUES.DEPOSIT_REJECTED,
      { depositId: deposit.id, userId: deposit.user_id },
    );

    const event: NotifyUserEvent = {
      userId: deposit.user_id,
      title: 'Deposit Rejected',
      message: 'Your deposit request was rejected. Review the proof and resubmit.',
      type: 'deposit_rejected',
    };
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      event,
    );

    if (!process.env.RABBITMQ_URL) {
      await this.insertNotification(event.userId, event.title, event.message, event.type);
    }

    return this.toDepositResponse(deposit);
  }

  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    const minWithdrawal = await this.getNumericSetting('min_withdrawal', 10);
    if (dto.amount < minWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal is ${minWithdrawal.toFixed(2)}`);
    }

    const withdrawalFeePercent = await this.getNumericSetting('withdrawal_fee_percent', 20);
    const feeAmount = Number(((dto.amount * withdrawalFeePercent) / 100).toFixed(2));
    const netAmount = Number((dto.amount - feeAmount).toFixed(2));

    const eligibility = await this.getWithdrawalEligibility(userId);
    if (!eligibility.allMet) {
      throw new ForbiddenException('Withdrawal requirements are not met');
    }

    const withdrawal = await this.databaseService.transaction(async (client) => {
      const balance = await this.ensureBalance(userId, client, true);
      const available = Number(balance.available);

      if (dto.amount > available) {
        throw new BadRequestException('Insufficient available balance');
      }

      await client.query(
        `
          UPDATE balances
          SET available = available - $2, pending = pending + $2, updated_at = NOW()
          WHERE user_id = $1
        `,
        [userId, dto.amount.toFixed(2)],
      );

      const inserted = await client.query<WithdrawalRow>(
        `
          INSERT INTO withdrawals (user_id, amount, fee_percent, fee_amount, net_amount, wallet_address, crypto)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        [
          userId,
          dto.amount.toFixed(2),
          withdrawalFeePercent.toFixed(2),
          feeAmount.toFixed(2),
          netAmount.toFixed(2),
          dto.walletAddress,
          dto.crypto ?? 'USDT_BEP20',
        ],
      );

      return inserted.rows[0];
    });

    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.WALLETS,
      RABBITMQ_QUEUES.WITHDRAWAL_REQUESTED,
      {
        withdrawalId: withdrawal.id,
        userId: withdrawal.user_id,
        amount: Number(withdrawal.amount),
      },
    );

    return this.toWithdrawalResponse(withdrawal);
  }

  async getWithdrawals(userId: string) {
    const result = await this.databaseService.query<WithdrawalRow>(
      `
        SELECT *
        FROM withdrawals
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => this.toWithdrawalResponse(row));
  }

  async getPendingWithdrawals() {
    const result = await this.databaseService.query<WithdrawalRow>(
      `
        SELECT w.*, u.username, u.email
        FROM withdrawals w
        JOIN users u ON u.id = w.user_id
        WHERE w.status = 'pending'
        ORDER BY w.created_at ASC
      `,
    );

    return result.rows.map((row) => this.toWithdrawalResponse(row));
  }

  async approveWithdrawal(withdrawalId: string, reviewerId: string) {
    const withdrawal = await this.databaseService.transaction(async (client) => {
      const currentWithdrawal = await this.lockWithdrawal(client, withdrawalId);

      if (currentWithdrawal.status !== 'pending') {
        throw new BadRequestException('Withdrawal is no longer pending');
      }

      await client.query(
        `
          UPDATE balances
          SET pending = pending - $2, updated_at = NOW()
          WHERE user_id = $1
        `,
        [currentWithdrawal.user_id, currentWithdrawal.amount],
      );

      const updated = await client.query<WithdrawalRow>(
        `
          UPDATE withdrawals
          SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [withdrawalId, reviewerId],
      );

      return updated.rows[0];
    });

    return this.toWithdrawalResponse(withdrawal);
  }

  async rejectWithdrawal(withdrawalId: string, reviewerId: string) {
    const withdrawal = await this.databaseService.transaction(async (client) => {
      const currentWithdrawal = await this.lockWithdrawal(client, withdrawalId);

      if (currentWithdrawal.status !== 'pending') {
        throw new BadRequestException('Withdrawal is no longer pending');
      }

      await client.query(
        `
          UPDATE balances
          SET pending = pending - $2, available = available + $2, updated_at = NOW()
          WHERE user_id = $1
        `,
        [currentWithdrawal.user_id, currentWithdrawal.amount],
      );

      const updated = await client.query<WithdrawalRow>(
        `
          UPDATE withdrawals
          SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [withdrawalId, reviewerId],
      );

      return updated.rows[0];
    });

    const event: NotifyUserEvent = {
      userId: withdrawal.user_id,
      title: 'Withdrawal Rejected',
      message: 'Your withdrawal was rejected and the funds were returned to your available balance.',
      type: 'withdrawal_rejected',
    };
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      event,
    );

    if (!process.env.RABBITMQ_URL) {
      await this.insertNotification(event.userId, event.title, event.message, event.type);
    }

    return this.toWithdrawalResponse(withdrawal);
  }

  async getWithdrawalEligibility(userId: string) {
    const userResult = await this.databaseService.query<UserRow>(
      `
        SELECT id, email, username, referral_code, referred_by
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );
    const user = userResult.rows[0];

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeSubscriptionResult = await this.databaseService.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM subscriptions
          WHERE user_id = $1
            AND status = 'active'
            AND expires_at > NOW()
        ) AS exists
      `,
      [userId],
    );
    const referredActivationResult = await this.databaseService.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM users referred
          WHERE referred.referred_by = $1
            AND EXISTS (
              SELECT 1
              FROM subscriptions s
              WHERE s.user_id = referred.id
                AND s.status = 'active'
                AND s.expires_at > NOW()
            )
        ) AS exists
      `,
      [userId],
    );

    const withdrawalIntervalDays = await this.getNumericSetting('withdrawal_interval_days', 30);
    const latestWithdrawalResult = await this.databaseService.query<RecentWithdrawalRow>(
      `
        SELECT created_at, status
        FROM withdrawals
        WHERE user_id = $1
          AND status IN ('pending', 'approved')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    const hasVIP = activeSubscriptionResult.rows[0]?.exists ?? false;
    const usedReferral = Boolean(user.referred_by);
    const referralActivatedVip = referredActivationResult.rows[0]?.exists ?? false;
    const recentWithdrawalAt = latestWithdrawalResult.rows[0]?.created_at ?? null;
    const nextWithdrawalAt =
      recentWithdrawalAt && withdrawalIntervalDays > 0
        ? new Date(
            new Date(recentWithdrawalAt).getTime() +
              withdrawalIntervalDays * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;
    const withdrawalFrequencyMet =
      !nextWithdrawalAt || new Date(nextWithdrawalAt).getTime() <= Date.now();
    const withdrawalFeePercent = await this.getNumericSetting('withdrawal_fee_percent', 20);
    const withdrawalProcessingHours = await this.getNumericSetting('withdrawal_processing_hours', 72);

    return {
      hasVIP,
      usedReferral,
      referralActivatedVip,
      withdrawalFrequencyMet,
      withdrawalIntervalDays,
      withdrawalFeePercent,
      withdrawalProcessingHours,
      recentWithdrawalAt,
      nextWithdrawalAt,
      allMet: hasVIP && usedReferral && referralActivatedVip && withdrawalFrequencyMet,
    };
  }

  async applyRewardClaim(event: RewardClaimedEvent): Promise<boolean> {
    const outcome = await this.databaseService.transaction(async (client) => {
      await this.ensureBalance(event.userId, client, true);

      const insertResult = await client.query<{ id: string }>(
        `
          INSERT INTO reward_claims (user_id, subscription_id, amount, claim_date)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, subscription_id, claim_date) DO NOTHING
          RETURNING id
        `,
        [event.userId, event.subscriptionId, event.totalReward.toFixed(2), event.date],
      );

      if (!insertResult.rowCount) {
        return false;
      }

      await client.query(
        `
          UPDATE balances
          SET
            available = available + $2,
            total_earned = total_earned + $2,
            this_month = this_month + $2,
            updated_at = NOW()
          WHERE user_id = $1
        `,
        [event.userId, event.totalReward.toFixed(2)],
      );

      return true;
    });

    if (outcome) {
      this.logger.log(
        `Applied reward claim for user ${event.userId} subscription ${event.subscriptionId} on ${event.date}`,
      );
    }

    return outcome;
  }

  private async ensureBalance(
    userId: string,
    client?: PoolClient,
    lockRow = false,
  ): Promise<BalanceRow> {
    const executor = (client ?? this.databaseService) as RowQueryExecutor;

    await executor.query(
      `
        INSERT INTO balances (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId],
    );

    const lockClause = lockRow ? 'FOR UPDATE' : '';
    const result = await executor.query<BalanceRow>(
      `
        SELECT available, pending, total_earned, this_month, updated_at
        FROM balances
        WHERE user_id = $1
        ${lockClause}
      `,
      [userId],
    );

    const balance = result.rows[0];
    if (!balance) {
      throw new NotFoundException('Balance not found');
    }

    return balance;
  }

  private async getVipTier(vipTierId: string): Promise<VipTierRow> {
    const result = await this.databaseService.query<VipTierRow>(
      `
        SELECT id, name, slug, price, daily_earnings, duration_days, sort_order
        FROM vip_tiers
        WHERE id = $1 AND is_active = true
        LIMIT 1
      `,
      [vipTierId],
    );

    const tier = result.rows[0];
    if (!tier) {
      throw new NotFoundException('VIP tier not found');
    }

    return tier;
  }

  private async getHighestActiveTier(userId: string): Promise<VipTierRow | null> {
    const result = await this.databaseService.query<VipTierRow>(
      `
        SELECT vt.id, vt.name, vt.slug, vt.price, vt.daily_earnings, vt.duration_days, vt.sort_order
        FROM subscriptions s
        JOIN vip_tiers vt ON vt.id = s.vip_tier_id
        WHERE s.user_id = $1
          AND s.status = 'active'
          AND s.expires_at > NOW()
        ORDER BY vt.sort_order DESC, vt.price DESC
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  private async assertVipTierCanBeActivated(
    userId: string,
    vipTierId: string,
    tierName: string,
  ): Promise<void> {
    const existingSubscription = await this.databaseService.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM subscriptions
          WHERE user_id = $1
            AND vip_tier_id = $2
        ) AS exists
      `,
      [userId, vipTierId],
    );

    if (existingSubscription.rows[0]?.exists) {
      throw new BadRequestException(
        `You can activate ${tierName} only one time per account.`,
      );
    }

    const existingPendingDeposit = await this.databaseService.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM deposits
          WHERE user_id = $1
            AND vip_tier_id = $2
            AND status = 'pending'
        ) AS exists
      `,
      [userId, vipTierId],
    );

    if (existingPendingDeposit.rows[0]?.exists) {
      throw new BadRequestException(
        `A ${tierName} activation is already pending verification.`,
      );
    }
  }

  private async getNumericSetting(key: string, fallback: number): Promise<number> {
    const result = await this.databaseService.query<{ value: string }>(
      `
        SELECT value
        FROM platform_settings
        WHERE key = $1
        LIMIT 1
      `,
      [key],
    );

    const parsed = Number(result.rows[0]?.value ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private async applyLocalDepositApproval(event: DepositApprovedEvent): Promise<void> {
    const tier = await this.getVipTier(event.vipTierId);

    await this.databaseService.transaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        `
          SELECT id
          FROM subscriptions
          WHERE user_id = $1
            AND vip_tier_id = $2
            AND started_at >= NOW() - INTERVAL '1 minute'
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [event.userId, event.vipTierId],
      );

      if (!existing.rows[0]) {
        const inserted = await client.query<{ id: string }>(
          `
            INSERT INTO subscriptions (
              user_id,
              vip_tier_id,
              status,
              started_at,
              expires_at,
              daily_earnings
            )
            VALUES (
              $1,
              $2,
              'active',
              NOW(),
              NOW() + ($3 || ' days')::INTERVAL,
              $4
            )
            RETURNING id
          `,
          [
            event.userId,
            event.vipTierId,
            tier.duration_days ?? 30,
            Number(tier.daily_earnings ?? 0).toFixed(2),
          ],
        );

        await applyReferralCommissions({
          executor: client,
          sourceUserId: event.userId,
          subscriptionId: inserted.rows[0].id,
          vipTierId: event.vipTierId,
          sourceAmount: Number(tier.price),
        });
      }
    });

    await this.insertNotification(
      event.userId,
      'VIP Activated',
      `${tier.name} is now active. Your daily tasks are live.`,
      'vip_activated',
    );
  }

  private async insertNotification(
    userId: string | null,
    title: string,
    message: string,
    type: string,
  ): Promise<void> {
    await this.databaseService.query(
      `
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
      `,
      [userId, title, message, type],
    );
  }

  private async lockDeposit(client: PoolClient, depositId: string): Promise<DepositRow> {
    const result = await client.query<DepositRow>(
      `
        SELECT *
        FROM deposits
        WHERE id = $1
        FOR UPDATE
      `,
      [depositId],
    );

    const deposit = result.rows[0];
    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    return deposit;
  }

  private async lockWithdrawal(client: PoolClient, withdrawalId: string): Promise<WithdrawalRow> {
    const result = await client.query<WithdrawalRow>(
      `
        SELECT *
        FROM withdrawals
        WHERE id = $1
        FOR UPDATE
      `,
      [withdrawalId],
    );

    const withdrawal = result.rows[0];
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

  private toBalanceResponse(row: BalanceRow) {
    return {
      available: Number(row.available),
      pending: Number(row.pending),
      totalEarned: Number(row.total_earned),
      thisMonth: Number(row.this_month),
      updatedAt: row.updated_at,
    };
  }

  private toDepositResponse(row: DepositRow) {
    return {
      id: row.id,
      userId: row.user_id,
      amount: Number(row.amount),
      crypto: row.crypto,
      txHash: row.tx_hash,
      proofUrl: row.proof_url,
      status: row.status,
      vipTierId: row.vip_tier_id,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      username: row.username ?? null,
      email: row.email ?? null,
    };
  }

  private toWithdrawalResponse(row: WithdrawalRow) {
    return {
      id: row.id,
      userId: row.user_id,
      amount: Number(row.amount),
      feePercent: Number(row.fee_percent ?? 0),
      feeAmount: Number(row.fee_amount ?? 0),
      netAmount: Number(row.net_amount ?? row.amount),
      walletAddress: row.wallet_address,
      crypto: row.crypto,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      username: row.username ?? null,
      email: row.email ?? null,
    };
  }
}
