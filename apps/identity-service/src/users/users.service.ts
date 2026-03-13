import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '@app/database';
import { UserRole, UserStatus } from '@app/common';
import {
  NotifyUserEvent,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RabbitMqService,
} from '@app/rabbitmq';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

interface UserWithBalanceRow {
  id: string;
  support_uid: string;
  username: string;
  email: string;
  referral_code: string;
  referred_by: string | null;
  role: UserRole;
  status: UserStatus;
  welcome_bonus_claimed: boolean;
  referral_team_bonus_claimed: boolean;
  created_at: string;
  updated_at: string;
  available: string | null;
  pending: string | null;
  total_earned: string | null;
  this_month: string | null;
  balance_updated_at: string | null;
}

interface BalanceRow {
  available: string;
  pending: string;
  total_earned: string;
  this_month: string;
  updated_at: string;
}

interface ReferralInviteRow {
  id: string;
  email: string;
  created_at: string;
}

interface ReferralLevelStatsRow {
  level: string;
  total_members: string;
  active_members: string;
}

interface ReferralCommissionStatsRow {
  level: string;
  total_earned: string;
}

interface SettingRow {
  key: string;
  value: string;
}

interface ReferralTeamBonusClaimRow {
  id: string;
  user_id: string;
  username: string;
  email: string;
  target_count: number;
  bonus_amount: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RowQueryExecutor {
  query<T = unknown>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

@Injectable()
export class UsersService {
  private readonly balanceFields = new Set([
    'available',
    'pending',
    'total_earned',
    'this_month',
  ]);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  async getMe(userId: string) {
    const user = await this.findUserWithBalance(userId);
    const referrals = await this.getReferralSummary(userId);
    return this.toUserResponse(user, referrals);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    if (!dto.username && !dto.email) {
      throw new BadRequestException('At least one field must be provided');
    }

    return this.databaseService.transaction(async (client) => {
      await this.ensureUniqueProfileFields(client, userId, dto);

      const assignments: string[] = [];
      const params: unknown[] = [];

      if (dto.username) {
        params.push(dto.username);
        assignments.push(`username = $${params.length}`);
      }

      if (dto.email) {
        params.push(dto.email.toLowerCase());
        assignments.push(`email = $${params.length}`);
      }

      params.push(userId);
      const result = await client.query<UserWithBalanceRow>(
        `
          UPDATE users
          SET ${assignments.join(', ')}, updated_at = NOW()
          WHERE id = $${params.length}
          RETURNING id, username, email, referral_code, referred_by, role, status, welcome_bonus_claimed, referral_team_bonus_claimed, created_at, updated_at,
                    support_uid,
                    NULL::TEXT AS available, NULL::TEXT AS pending, NULL::TEXT AS total_earned, NULL::TEXT AS this_month, NULL::TEXT AS balance_updated_at
        `,
        params,
      );

      const updated = result.rows[0];
      if (!updated) {
        throw new NotFoundException('User not found');
      }

      const hydratedUser = await this.findUserWithBalance(updated.id, client);
      const referrals = await this.getReferralSummary(updated.id, client);
      return this.toUserResponse(hydratedUser, referrals);
    });
  }

  async getUserById(userId: string) {
    const user = await this.findUserWithBalance(userId);
    return this.toUserResponse(user);
  }

  async listUsers(query: ListUsersQueryDto) {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (query.role) {
      params.push(query.role);
      filters.push(`u.role = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      filters.push(`u.status = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      filters.push(`(LOWER(u.username) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = query.limit;
    const offset = (query.page - 1) * query.limit;

    const countResult = await this.databaseService.query<{ count: string }>(
      `
        SELECT COUNT(*)::TEXT AS count
        FROM users u
        ${whereClause}
      `,
      params,
    );

    const listingParams = [...params, limit, offset];
    const rowsResult = await this.databaseService.query<UserWithBalanceRow>(
      `
        SELECT
          u.id,
          u.support_uid,
          u.username,
          u.email,
          u.referral_code,
          u.referred_by,
          u.role,
          u.status,
          u.welcome_bonus_claimed,
          u.referral_team_bonus_claimed,
          u.created_at,
          u.updated_at,
          b.available,
          b.pending,
          b.total_earned,
          b.this_month,
          b.updated_at AS balance_updated_at
        FROM users u
        LEFT JOIN balances b ON b.user_id = u.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${listingParams.length - 1}
        OFFSET $${listingParams.length}
      `,
      listingParams,
    );

    return {
      data: rowsResult.rows.map((row) => this.toUserResponse(row)),
      page: query.page,
      limit,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async updateStatus(userId: string, dto: UpdateUserStatusDto) {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query<UserWithBalanceRow>(
        `
          UPDATE users
          SET status = $2, updated_at = NOW()
          WHERE id = $1
          RETURNING id, username, email, referral_code, referred_by, role, status, welcome_bonus_claimed, referral_team_bonus_claimed, created_at, updated_at,
                    support_uid,
                    NULL::TEXT AS available, NULL::TEXT AS pending, NULL::TEXT AS total_earned, NULL::TEXT AS this_month, NULL::TEXT AS balance_updated_at
        `,
        [userId, dto.status],
      );

      const updated = result.rows[0];
      if (!updated) {
        throw new NotFoundException('User not found');
      }

      if (dto.status === 'banned') {
        await client.query(
          `
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL
          `,
          [userId],
        );
      }

      const hydratedUser = await this.findUserWithBalance(updated.id, client);
      return this.toUserResponse(hydratedUser);
    });
  }

  async adjustBalance(userId: string, dto: AdjustBalanceDto) {
    if (!this.balanceFields.has(dto.field)) {
      throw new BadRequestException('Unsupported balance field');
    }

    return this.databaseService.transaction(async (client) => {
      await this.ensureUserExists(client, userId);

      await client.query(
        `
          INSERT INTO balances (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [userId],
      );

      const currentResult = await client.query<BalanceRow>(
        `
          SELECT available, pending, total_earned, this_month, updated_at
          FROM balances
          WHERE user_id = $1
          FOR UPDATE
        `,
        [userId],
      );
      const current = currentResult.rows[0];

      if (!current) {
        throw new NotFoundException('Balance record not found');
      }

      const currentValue = Number(current[dto.field]);
      const nextValue = this.computeNextBalance(currentValue, dto.operation, dto.amount);

      await client.query(
        `
          UPDATE balances
          SET ${dto.field} = $2, updated_at = NOW()
          WHERE user_id = $1
        `,
        [userId, nextValue.toFixed(2)],
      );

      const hydratedUser = await this.findUserWithBalance(userId, client);
      return this.toUserResponse(hydratedUser);
    });
  }

  async claimWelcomeBonus(userId: string) {
    const bonusAmount = await this.getWelcomeBonus();

    if (bonusAmount <= 0) {
      throw new BadRequestException('Welcome bonus is disabled');
    }

    const user = await this.databaseService.transaction(async (client) => {
      const userResult = await client.query<{
        id: string;
        welcome_bonus_claimed: boolean;
      }>(
        `
          SELECT id, welcome_bonus_claimed
          FROM users
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [userId],
      );

      const currentUser = userResult.rows[0];
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      if (currentUser.welcome_bonus_claimed) {
        throw new BadRequestException('Welcome bonus has already been claimed');
      }

      await client.query(
        `
          INSERT INTO balances (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [userId],
      );

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
        [userId, bonusAmount],
      );

      await client.query(
        `
          UPDATE users
          SET welcome_bonus_claimed = true, updated_at = NOW()
          WHERE id = $1
        `,
        [userId],
      );

      return this.findUserWithBalance(userId, client);
    });

    const event: NotifyUserEvent = {
      userId,
      title: 'Welcome Bonus Claimed!',
      message: `You received $${bonusAmount.toFixed(2)} as your welcome bonus.`,
      type: 'welcome',
    };
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      event,
    );

    return {
      amount: bonusAmount,
      user: this.toUserResponse(user),
    };
  }

  async claimReferralTeamBonus(userId: string) {
    const { target, amount } = await this.getReferralTeamBonusConfig();

    const user = await this.databaseService.transaction(async (client) => {
      const userResult = await client.query<{
        id: string;
        referral_team_bonus_claimed: boolean;
      }>(
        `
          SELECT id, referral_team_bonus_claimed
          FROM users
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [userId],
      );

      const currentUser = userResult.rows[0];
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      if (currentUser.referral_team_bonus_claimed) {
        throw new BadRequestException('Referral team giveaway has already been approved');
      }

      const directReferralsResult = await client.query<{ count: string }>(
        `
          SELECT COUNT(*)::TEXT AS count
          FROM users
          WHERE referred_by = $1
        `,
        [userId],
      );
      const totalReferrals = Number(directReferralsResult.rows[0]?.count ?? 0);

      if (totalReferrals < target) {
        throw new BadRequestException(`You need ${target} direct members before requesting this giveaway`);
      }

      const existingClaimResult = await client.query<{ status: 'pending' | 'approved' | 'rejected' }>(
        `
          SELECT status
          FROM referral_team_bonus_claims
          WHERE user_id = $1
            AND target_count = $2
            AND status IN ('pending', 'approved')
          LIMIT 1
          FOR UPDATE
        `,
        [userId, target],
      );

      const existingClaim = existingClaimResult.rows[0];
      if (existingClaim?.status === 'pending') {
        throw new BadRequestException('Your giveaway request is already pending review');
      }
      if (existingClaim?.status === 'approved') {
        throw new BadRequestException('Referral team giveaway has already been approved');
      }

      await client.query(
        `
          INSERT INTO referral_team_bonus_claims (
            user_id,
            target_count,
            bonus_amount,
            status
          )
          VALUES ($1, $2, $3, 'pending')
        `,
        [userId, target, amount.toFixed(2)],
      );

      const hydratedUser = await this.findUserWithBalance(userId, client);
      const referrals = await this.getReferralSummary(userId, client);
      return this.toUserResponse(hydratedUser, referrals);
    });

    const event: NotifyUserEvent = {
      userId,
      title: 'Giveaway Request Submitted',
      message: `Your $${amount.toFixed(2)} referral team giveaway request is pending admin review.`,
      type: 'referral_team_bonus_pending',
    };
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      event,
    );

    return {
      amount,
      target,
      user,
    };
  }

  async listReferralTeamBonusClaims() {
    const result = await this.databaseService.query<ReferralTeamBonusClaimRow>(
      `
        SELECT
          claims.id,
          claims.user_id,
          claimant.username,
          claimant.email,
          claims.target_count,
          claims.bonus_amount,
          claims.status,
          claims.reviewed_by,
          reviewer.username AS reviewed_by_username,
          claims.reviewed_at,
          claims.created_at,
          claims.updated_at
        FROM referral_team_bonus_claims claims
        JOIN users claimant ON claimant.id = claims.user_id
        LEFT JOIN users reviewer ON reviewer.id = claims.reviewed_by
        ORDER BY
          CASE claims.status
            WHEN 'pending' THEN 0
            WHEN 'approved' THEN 1
            ELSE 2
          END,
          claims.created_at DESC
      `,
    );

    return result.rows.map((row) => this.toReferralTeamBonusClaimResponse(row));
  }

  async approveReferralTeamBonusClaim(claimId: string, reviewerId: string) {
    const claim = await this.databaseService.transaction(async (client) => {
      const claimResult = await client.query<ReferralTeamBonusClaimRow>(
        `
          SELECT
            claims.id,
            claims.user_id,
            claimant.username,
            claimant.email,
            claims.target_count,
            claims.bonus_amount,
            claims.status,
            claims.reviewed_by,
            NULL::TEXT AS reviewed_by_username,
            claims.reviewed_at,
            claims.created_at,
            claims.updated_at
          FROM referral_team_bonus_claims claims
          JOIN users claimant ON claimant.id = claims.user_id
          WHERE claims.id = $1
          LIMIT 1
          FOR UPDATE OF claims
        `,
        [claimId],
      );

      const claim = claimResult.rows[0];
      if (!claim) {
        throw new NotFoundException('Referral giveaway request not found');
      }

      if (claim.status !== 'pending') {
        throw new BadRequestException('Only pending giveaway requests can be approved');
      }

      const userResult = await client.query<{ referral_team_bonus_claimed: boolean }>(
        `
          SELECT referral_team_bonus_claimed
          FROM users
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [claim.user_id],
      );

      const currentUser = userResult.rows[0];
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      if (currentUser.referral_team_bonus_claimed) {
        throw new BadRequestException('Referral team giveaway has already been approved');
      }

      const reviewerResult = await client.query<{ username: string }>(
        `
          SELECT username
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [reviewerId],
      );

      await client.query(
        `
          INSERT INTO balances (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [claim.user_id],
      );

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
        [claim.user_id, claim.bonus_amount],
      );

      await client.query(
        `
          UPDATE users
          SET referral_team_bonus_claimed = true, updated_at = NOW()
          WHERE id = $1
        `,
        [claim.user_id],
      );

      const updatedResult = await client.query<ReferralTeamBonusClaimRow>(
        `
          UPDATE referral_team_bonus_claims
          SET
            status = 'approved',
            reviewed_by = $2,
            reviewed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            user_id,
            $3::TEXT AS username,
            $4::TEXT AS email,
            target_count,
            bonus_amount,
            status,
            reviewed_by,
            $5::TEXT AS reviewed_by_username,
            reviewed_at,
            created_at,
            updated_at
        `,
        [
          claim.id,
          reviewerId,
          claim.username,
          claim.email,
          reviewerResult.rows[0]?.username ?? 'admin',
        ],
      );

      return updatedResult.rows[0];
    });

    const event: NotifyUserEvent = {
      userId: claim.user_id,
      title: 'Giveaway Approved',
      message: `Your $${Number(claim.bonus_amount).toFixed(2)} referral team giveaway was approved and credited.`,
      type: 'referral_team_bonus_approved',
    };
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      event,
    );

    return this.toReferralTeamBonusClaimResponse(claim);
  }

  async rejectReferralTeamBonusClaim(claimId: string, reviewerId: string) {
    const claim = await this.databaseService.transaction(async (client) => {
      const claimResult = await client.query<ReferralTeamBonusClaimRow>(
        `
          SELECT
            claims.id,
            claims.user_id,
            claimant.username,
            claimant.email,
            claims.target_count,
            claims.bonus_amount,
            claims.status,
            claims.reviewed_by,
            NULL::TEXT AS reviewed_by_username,
            claims.reviewed_at,
            claims.created_at,
            claims.updated_at
          FROM referral_team_bonus_claims claims
          JOIN users claimant ON claimant.id = claims.user_id
          WHERE claims.id = $1
          LIMIT 1
          FOR UPDATE OF claims
        `,
        [claimId],
      );

      const claim = claimResult.rows[0];
      if (!claim) {
        throw new NotFoundException('Referral giveaway request not found');
      }

      if (claim.status !== 'pending') {
        throw new BadRequestException('Only pending giveaway requests can be rejected');
      }

      const reviewerResult = await client.query<{ username: string }>(
        `
          SELECT username
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [reviewerId],
      );

      const updatedResult = await client.query<ReferralTeamBonusClaimRow>(
        `
          UPDATE referral_team_bonus_claims
          SET
            status = 'rejected',
            reviewed_by = $2,
            reviewed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            user_id,
            $3::TEXT AS username,
            $4::TEXT AS email,
            target_count,
            bonus_amount,
            status,
            reviewed_by,
            $5::TEXT AS reviewed_by_username,
            reviewed_at,
            created_at,
            updated_at
        `,
        [claim.id, reviewerId, claim.username, claim.email, reviewerResult.rows[0]?.username ?? 'admin'],
      );

      return updatedResult.rows[0];
    });

    const event: NotifyUserEvent = {
      userId: claim.user_id,
      title: 'Giveaway Request Rejected',
      message: 'Your referral team giveaway request was rejected. Contact support if you need clarification.',
      type: 'referral_team_bonus_rejected',
    };
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      event,
    );

    return this.toReferralTeamBonusClaimResponse(claim);
  }

  private async findUserWithBalance(
    userId: string,
    client?: PoolClient,
  ): Promise<UserWithBalanceRow> {
    const executor = (client ?? this.databaseService) as RowQueryExecutor;
    const result = await executor.query<UserWithBalanceRow>(
      `
        SELECT
          u.id,
          u.support_uid,
          u.username,
          u.email,
          u.referral_code,
          u.referred_by,
          u.role,
          u.status,
          u.welcome_bonus_claimed,
          u.referral_team_bonus_claimed,
          u.created_at,
          u.updated_at,
          b.available,
          b.pending,
          b.total_earned,
          b.this_month,
          b.updated_at AS balance_updated_at
        FROM users u
        LEFT JOIN balances b ON b.user_id = u.id
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId],
    );

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async ensureUserExists(
    client: PoolClient,
    userId: string,
  ): Promise<void> {
    const result = await client.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    if (!result.rowCount) {
      throw new NotFoundException('User not found');
    }
  }

  private async ensureUniqueProfileFields(
    client: PoolClient,
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<void> {
    if (!dto.username && !dto.email) {
      return;
    }

    const conditions: string[] = [];
    const params: unknown[] = [userId];

    if (dto.username) {
      params.push(dto.username.toLowerCase());
      conditions.push(`LOWER(username) = $${params.length}`);
    }

    if (dto.email) {
      params.push(dto.email.toLowerCase());
      conditions.push(`LOWER(email) = $${params.length}`);
    }

    const result = await client.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE id <> $1 AND (${conditions.join(' OR ')})
        LIMIT 1
      `,
      params,
    );

    if (result.rowCount) {
      throw new ConflictException('Email or username is already in use');
    }
  }

  private computeNextBalance(
    currentValue: number,
    operation: AdjustBalanceDto['operation'],
    amount: number,
  ): number {
    if (operation === 'set') {
      return amount;
    }

    const nextValue = operation === 'credit' ? currentValue + amount : currentValue - amount;
    if (nextValue < 0) {
      throw new BadRequestException('Balance cannot become negative');
    }

    return nextValue;
  }

  private async getWelcomeBonus(): Promise<number> {
    const result = await this.databaseService.query<{ value: string }>(
      `
        SELECT value
        FROM platform_settings
        WHERE key = 'welcome_bonus'
        LIMIT 1
      `,
    );

    const rawValue = result.rows[0]?.value ?? process.env.WELCOME_BONUS_FALLBACK ?? '1';
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  private async getReferralSummary(
    userId: string,
    client?: PoolClient,
  ): Promise<{
    count: number;
    users: Array<{ id: string; email: string; createdAt: string }>;
    bonus: {
      targetCount: number;
      currentCount: number;
      amount: number;
      eligible: boolean;
      pending: boolean;
      claimed: boolean;
      status: 'locked' | 'eligible' | 'pending' | 'approved' | 'rejected';
      requestedAt: string | null;
      reviewedAt: string | null;
    };
    levels: Array<{
      level: 1 | 2 | 3;
      percent: number;
      totalMembers: number;
      activeMembers: number;
      totalEarned: number;
    }>;
  }> {
    const executor = (client ?? this.databaseService) as RowQueryExecutor;
    const directInvitesResult = await executor.query<ReferralInviteRow>(
      `
        SELECT id, email, created_at
        FROM users
        WHERE referred_by = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    const levelStatsResult = await executor.query<ReferralLevelStatsRow>(
      `
        WITH RECURSIVE downline AS (
          SELECT id, 1 AS level
          FROM users
          WHERE referred_by = $1

          UNION ALL

          SELECT u.id, downline.level + 1
          FROM users u
          JOIN downline ON u.referred_by = downline.id
          WHERE downline.level < 3
        )
        SELECT
          downline.level::TEXT AS level,
          COUNT(*)::TEXT AS total_members,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1
              FROM subscriptions s
              WHERE s.user_id = downline.id
                AND s.status = 'active'
                AND s.expires_at > NOW()
            )
          )::TEXT AS active_members
        FROM downline
        GROUP BY downline.level
      `,
      [userId],
    );

    const commissionStatsResult = await executor.query<ReferralCommissionStatsRow>(
      `
        SELECT level::TEXT AS level, COALESCE(SUM(commission_amount), 0)::TEXT AS total_earned
        FROM referral_commissions
        WHERE beneficiary_user_id = $1
        GROUP BY level
      `,
      [userId],
    );

    const ratesResult = await executor.query<SettingRow>(
      `
        SELECT key, value
        FROM platform_settings
        WHERE key IN (
          'referral_level_1_percent',
          'referral_level_2_percent',
          'referral_level_3_percent',
          'referral_team_bonus_target',
          'referral_team_bonus_amount'
        )
      `,
    );

    const bonusClaimResult = await executor.query<{
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      reviewed_at: string | null;
      created_at: string;
    }>(
      `
        SELECT id, status, reviewed_at, created_at
        FROM referral_team_bonus_claims
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    const levelStats = new Map(
      levelStatsResult.rows.map((row) => [
        Number(row.level),
        {
          totalMembers: Number(row.total_members),
          activeMembers: Number(row.active_members),
        },
      ]),
    );
    const commissionStats = new Map(
      commissionStatsResult.rows.map((row) => [Number(row.level), Number(row.total_earned)]),
    );
    const rates = Object.fromEntries(ratesResult.rows.map((row) => [row.key, Number(row.value)]));
    const latestBonusClaim = bonusClaimResult.rows[0];
    const directReferralCount = directInvitesResult.rows.length;
    const targetCount = Number(rates.referral_team_bonus_target ?? 5) || 5;
    const bonusAmount = Number(rates.referral_team_bonus_amount ?? 500) || 500;

    return {
      count: directReferralCount,
      users: directInvitesResult.rows.map((row) => ({
        id: row.id,
        email: this.maskEmail(row.email),
        createdAt: row.created_at,
      })),
      levels: ([1, 2, 3] as const).map((level) => ({
        level,
        percent:
          Number(
            rates[`referral_level_${level}_percent` as const] ??
              (level === 1 ? 10 : level === 2 ? 5 : 2),
          ) || (level === 1 ? 10 : level === 2 ? 5 : 2),
        totalMembers: levelStats.get(level)?.totalMembers ?? 0,
        activeMembers: levelStats.get(level)?.activeMembers ?? 0,
        totalEarned: commissionStats.get(level) ?? 0,
      })),
      bonus: {
        targetCount,
        currentCount: directReferralCount,
        amount: bonusAmount,
        eligible:
          directReferralCount >= targetCount &&
          (!latestBonusClaim || latestBonusClaim.status === 'rejected'),
        pending: latestBonusClaim?.status === 'pending',
        claimed: latestBonusClaim?.status === 'approved',
        status: latestBonusClaim?.status ?? (directReferralCount >= targetCount ? 'eligible' : 'locked'),
        requestedAt: latestBonusClaim?.created_at ?? null,
        reviewedAt: latestBonusClaim?.reviewed_at ?? null,
      },
    };
  }

  private async getReferralTeamBonusConfig() {
    const settingsResult = await this.databaseService.query<SettingRow>(
      `
        SELECT key, value
        FROM platform_settings
        WHERE key IN ('referral_team_bonus_target', 'referral_team_bonus_amount')
      `,
    );

    const settings = Object.fromEntries(settingsResult.rows.map((row) => [row.key, row.value]));
    const target = Number(settings.referral_team_bonus_target ?? 5);
    const amount = Number(settings.referral_team_bonus_amount ?? 500);

    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Referral team giveaway settings are invalid');
    }

    return { target, amount };
  }

  private maskEmail(email: string): string {
    const visible = email.slice(0, 3);
    return `${visible}*****`;
  }

  private toReferralTeamBonusClaimResponse(row: ReferralTeamBonusClaimRow) {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      targetCount: Number(row.target_count),
      bonusAmount: Number(row.bonus_amount),
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedByUsername: row.reviewed_by_username,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toUserResponse(
    row: UserWithBalanceRow,
    referralSummary?: {
      count: number;
      users: Array<{ id: string; email: string; createdAt: string }>;
      bonus: {
        targetCount: number;
        currentCount: number;
        amount: number;
        eligible: boolean;
        pending: boolean;
        claimed: boolean;
        status: 'locked' | 'eligible' | 'pending' | 'approved' | 'rejected';
        requestedAt: string | null;
        reviewedAt: string | null;
      };
      levels: Array<{
        level: 1 | 2 | 3;
        percent: number;
        totalMembers: number;
        activeMembers: number;
        totalEarned: number;
      }>;
    },
  ) {
    return {
      id: row.id,
      supportUid: row.support_uid,
      username: row.username,
      email: row.email,
      referralCode: row.referral_code,
      referredBy: row.referred_by,
      role: row.role,
      status: row.status,
      welcomeBonusClaimed: row.welcome_bonus_claimed,
      referralTeamBonusClaimed: row.referral_team_bonus_claimed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      balance: {
        available: Number(row.available ?? 0),
        pending: Number(row.pending ?? 0),
        totalEarned: Number(row.total_earned ?? 0),
        thisMonth: Number(row.this_month ?? 0),
        updatedAt: row.balance_updated_at,
      },
      referralSummary,
    };
  }
}
