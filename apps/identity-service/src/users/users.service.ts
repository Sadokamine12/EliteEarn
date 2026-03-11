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
  username: string;
  email: string;
  referral_code: string;
  referred_by: string | null;
  role: UserRole;
  status: UserStatus;
  welcome_bonus_claimed: boolean;
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
          RETURNING id, username, email, referral_code, referred_by, role, status, welcome_bonus_claimed, created_at, updated_at,
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
          u.username,
          u.email,
          u.referral_code,
          u.referred_by,
          u.role,
          u.status,
          u.welcome_bonus_claimed,
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
          RETURNING id, username, email, referral_code, referred_by, role, status, welcome_bonus_claimed, created_at, updated_at,
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

  private async findUserWithBalance(
    userId: string,
    client?: PoolClient,
  ): Promise<UserWithBalanceRow> {
    const executor = (client ?? this.databaseService) as RowQueryExecutor;
    const result = await executor.query<UserWithBalanceRow>(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.referral_code,
          u.referred_by,
          u.role,
          u.status,
          u.welcome_bonus_claimed,
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
  ): Promise<{ count: number; users: Array<{ id: string; email: string; createdAt: string }> }> {
    const executor = (client ?? this.databaseService) as RowQueryExecutor;
    const result = await executor.query<ReferralInviteRow>(
      `
        SELECT id, email, created_at
        FROM users
        WHERE referred_by = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return {
      count: result.rows.length,
      users: result.rows.map((row) => ({
        id: row.id,
        email: this.maskEmail(row.email),
        createdAt: row.created_at,
      })),
    };
  }

  private maskEmail(email: string): string {
    const visible = email.slice(0, 3);
    return `${visible}*****`;
  }

  private toUserResponse(
    row: UserWithBalanceRow,
    referralSummary?: { count: number; users: Array<{ id: string; email: string; createdAt: string }> },
  ) {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      referralCode: row.referral_code,
      referredBy: row.referred_by,
      role: row.role,
      status: row.status,
      welcomeBonusClaimed: row.welcome_bonus_claimed,
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
