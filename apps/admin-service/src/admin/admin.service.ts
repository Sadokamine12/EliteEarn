import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  NotifyUserEvent,
  RabbitMqService,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
} from '@app/rabbitmq';
import { BroadcastDto } from './dto/broadcast.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

interface StatsRow {
  total_users: string;
  active_users: string;
  total_deposits: string;
  total_withdrawals: string;
  pending_deposits: string;
  pending_withdrawals: string;
  active_subscriptions: string;
  daily_revenue: string;
  weekly_revenue: string;
  monthly_revenue: string;
}

interface DepositRow {
  id: string;
  user_id: string;
  amount: string;
  crypto: string;
  tx_hash: string | null;
  proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  vip_tier_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  username: string | null;
  email: string | null;
  vip_tier_name: string | null;
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: string;
  fee_percent: string;
  fee_amount: string;
  net_amount: string;
  wallet_address: string;
  crypto: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  username: string | null;
  email: string | null;
}

interface PromotionRow {
  id: string;
  title: string;
  subtitle: string | null;
  type: 'bonus_week' | 'banner' | 'wheel';
  multiplier: string;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
}

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

interface CountRow {
  total: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  async getStats() {
    const result = await this.databaseService.query<StatsRow>(
      `
        SELECT
          (SELECT COUNT(*)::TEXT FROM users) AS total_users,
          (SELECT COUNT(*)::TEXT FROM users WHERE status = 'active') AS active_users,
          (SELECT COALESCE(SUM(amount), 0)::TEXT FROM deposits WHERE status = 'approved') AS total_deposits,
          (SELECT COALESCE(SUM(COALESCE(net_amount, amount)), 0)::TEXT FROM withdrawals WHERE status = 'approved') AS total_withdrawals,
          (SELECT COUNT(*)::TEXT FROM deposits WHERE status = 'pending') AS pending_deposits,
          (SELECT COUNT(*)::TEXT FROM withdrawals WHERE status = 'pending') AS pending_withdrawals,
          (SELECT COUNT(*)::TEXT FROM subscriptions WHERE status = 'active' AND expires_at > NOW()) AS active_subscriptions,
          (SELECT COALESCE(SUM(amount), 0)::TEXT FROM deposits WHERE status = 'approved' AND reviewed_at >= date_trunc('day', NOW())) AS daily_revenue,
          (SELECT COALESCE(SUM(amount), 0)::TEXT FROM deposits WHERE status = 'approved' AND reviewed_at >= NOW() - INTERVAL '7 days') AS weekly_revenue,
          (SELECT COALESCE(SUM(amount), 0)::TEXT FROM deposits WHERE status = 'approved' AND reviewed_at >= date_trunc('month', NOW())) AS monthly_revenue
      `,
    );

    const row = result.rows[0];
    return {
      totalUsers: Number(row.total_users),
      activeUsers: Number(row.active_users),
      totalDeposits: Number(row.total_deposits),
      totalWithdrawals: Number(row.total_withdrawals),
      pendingDeposits: Number(row.pending_deposits),
      pendingWithdrawals: Number(row.pending_withdrawals),
      activeSubscriptions: Number(row.active_subscriptions),
      dailyRevenue: Number(row.daily_revenue),
      weeklyRevenue: Number(row.weekly_revenue),
      monthlyRevenue: Number(row.monthly_revenue),
    };
  }

  async listDeposits(query: ListLedgerQueryDto): Promise<PaginatedResponse<ReturnType<AdminService['toDepositResponse']>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;
    const { whereClause, params } = this.buildDepositFilters(query);

    const countResult = await this.databaseService.query<CountRow>(
      `
        SELECT COUNT(*)::TEXT AS total
        FROM deposits d
        JOIN users u ON u.id = d.user_id
        LEFT JOIN vip_tiers v ON v.id = d.vip_tier_id
        ${whereClause}
      `,
      params,
    );

    const rowsResult = await this.databaseService.query<DepositRow>(
      `
        SELECT d.*, u.username, u.email, v.name AS vip_tier_name
        FROM deposits d
        JOIN users u ON u.id = d.user_id
        LEFT JOIN vip_tiers v ON v.id = d.vip_tier_id
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, limit, offset],
    );

    return {
      data: rowsResult.rows.map((row) => this.toDepositResponse(row)),
      page,
      limit,
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async listWithdrawals(query: ListLedgerQueryDto): Promise<PaginatedResponse<ReturnType<AdminService['toWithdrawalResponse']>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;
    const { whereClause, params } = this.buildWithdrawalFilters(query);

    const countResult = await this.databaseService.query<CountRow>(
      `
        SELECT COUNT(*)::TEXT AS total
        FROM withdrawals w
        JOIN users u ON u.id = w.user_id
        ${whereClause}
      `,
      params,
    );

    const rowsResult = await this.databaseService.query<WithdrawalRow>(
      `
        SELECT w.*, u.username, u.email
        FROM withdrawals w
        JOIN users u ON u.id = w.user_id
        ${whereClause}
        ORDER BY w.created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, limit, offset],
    );

    return {
      data: rowsResult.rows.map((row) => this.toWithdrawalResponse(row)),
      page,
      limit,
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async listPromotions() {
    const result = await this.databaseService.query<PromotionRow>(
      `
        SELECT *
        FROM promotions
        ORDER BY created_at DESC
      `,
    );

    return result.rows.map((row) => this.toPromotionResponse(row));
  }

  async createPromotion(dto: CreatePromotionDto) {
    const result = await this.databaseService.query<PromotionRow>(
      `
        INSERT INTO promotions (title, subtitle, type, multiplier, is_active, ends_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        dto.title,
        dto.subtitle ?? null,
        dto.type,
        (dto.multiplier ?? 1).toFixed(2),
        dto.isActive ?? false,
        dto.endsAt ? new Date(dto.endsAt).toISOString() : null,
      ],
    );

    return this.toPromotionResponse(result.rows[0]);
  }

  async updatePromotion(id: string, dto: UpdatePromotionDto) {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (dto.title !== undefined) {
      params.push(dto.title);
      fields.push(`title = $${params.length}`);
    }
    if (dto.subtitle !== undefined) {
      params.push(dto.subtitle ?? null);
      fields.push(`subtitle = $${params.length}`);
    }
    if (dto.type !== undefined) {
      params.push(dto.type);
      fields.push(`type = $${params.length}`);
    }
    if (dto.multiplier !== undefined) {
      params.push(dto.multiplier.toFixed(2));
      fields.push(`multiplier = $${params.length}`);
    }
    if (dto.isActive !== undefined) {
      params.push(dto.isActive);
      fields.push(`is_active = $${params.length}`);
    }
    if (dto.endsAt !== undefined) {
      params.push(dto.endsAt ? new Date(dto.endsAt).toISOString() : null);
      fields.push(`ends_at = $${params.length}`);
    }

    if (fields.length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    params.push(id);
    const result = await this.databaseService.query<PromotionRow>(
      `
        UPDATE promotions
        SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
      `,
      params,
    );

    const promotion = result.rows[0];
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return this.toPromotionResponse(promotion);
  }

  async getSettings() {
    const result = await this.databaseService.query<SettingRow>(
      `
        SELECT key, value, updated_at
        FROM platform_settings
        ORDER BY key ASC
      `,
    );

    return result.rows.map((row) => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at,
    }));
  }

  async updateSettings(payload: Record<string, string>) {
    const entries = Object.entries(payload);
    if (entries.length === 0) {
      throw new BadRequestException('No settings provided');
    }

    await this.databaseService.transaction(async (client) => {
      for (const [key, value] of entries) {
        await client.query(
          `
            INSERT INTO platform_settings (key, value, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (key)
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
          `,
          [key, value],
        );
      }
    });

    return this.getSettings();
  }

  async broadcast(dto: BroadcastDto) {
    const targetUserId = dto.userId ?? null;
    const type = dto.type ?? 'broadcast';

    const result = await this.databaseService.query<{ id: string; created_at: string }>(
      `
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `,
      [targetUserId, dto.title, dto.message, type],
    );

    const event: NotifyUserEvent = {
      userId: targetUserId,
      title: dto.title,
      message: dto.message,
      type,
    };

    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      event,
    );

    return {
      id: result.rows[0].id,
      userId: targetUserId,
      title: dto.title,
      message: dto.message,
      type,
      createdAt: result.rows[0].created_at,
    };
  }

  private toPromotionResponse(row: PromotionRow) {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      type: row.type,
      multiplier: Number(row.multiplier),
      isActive: row.is_active,
      endsAt: row.ends_at,
      createdAt: row.created_at,
    };
  }

  private toDepositResponse(row: DepositRow) {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
      amount: Number(row.amount),
      crypto: row.crypto,
      txHash: row.tx_hash,
      proofUrl: row.proof_url,
      status: row.status,
      vipTierId: row.vip_tier_id,
      vipTierName: row.vip_tier_name,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
    };
  }

  private toWithdrawalResponse(row: WithdrawalRow) {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      email: row.email,
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
    };
  }

  private buildDepositFilters(query: ListLedgerQueryDto) {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      clauses.push(`d.status = $${params.length}`);
    }

    if (query.crypto) {
      params.push(query.crypto);
      clauses.push(`d.crypto = $${params.length}`);
    }

    if (query.search?.trim()) {
      const pattern = `%${query.search.trim()}%`;
      params.push(pattern);
      clauses.push(
        `(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR COALESCE(d.tx_hash, '') ILIKE $${params.length} OR COALESCE(v.name, '') ILIKE $${params.length})`,
      );
    }

    return {
      whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private buildWithdrawalFilters(query: ListLedgerQueryDto) {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      clauses.push(`w.status = $${params.length}`);
    }

    if (query.crypto) {
      params.push(query.crypto);
      clauses.push(`w.crypto = $${params.length}`);
    }

    if (query.search?.trim()) {
      const pattern = `%${query.search.trim()}%`;
      params.push(pattern);
      clauses.push(
        `(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR w.wallet_address ILIKE $${params.length})`,
      );
    }

    return {
      whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }
}
