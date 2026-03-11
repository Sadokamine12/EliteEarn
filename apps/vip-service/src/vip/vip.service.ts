import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  DepositApprovedEvent,
  NotifyUserEvent,
  RabbitMqService,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
} from '@app/rabbitmq';
import { CreateVipTierDto } from './dto/create-vip-tier.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { UpdateVipTierDto } from './dto/update-vip-tier.dto';

interface VipTierRow {
  id: string;
  name: string;
  slug: string;
  price: string;
  daily_earnings: string;
  daily_tasks_count: number;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  vip_tier_id: string;
  status: 'active' | 'expired' | 'cancelled';
  started_at: string;
  expires_at: string;
  daily_earnings: string;
  created_at: string;
  tier_name?: string;
  tier_slug?: string;
}

@Injectable()
export class VipService {
  private readonly logger = new Logger(VipService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  async listVipTiers(includeInactive = false) {
    const result = await this.databaseService.query<VipTierRow>(
      `
        SELECT *
        FROM vip_tiers
        ${includeInactive ? '' : 'WHERE is_active = true'}
        ORDER BY sort_order ASC, created_at ASC
      `,
    );

    return result.rows.map((row) => this.toVipTierResponse(row));
  }

  async getVipTier(id: string) {
    const result = await this.databaseService.query<VipTierRow>(
      `
        SELECT *
        FROM vip_tiers
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    const tier = result.rows[0];
    if (!tier) {
      throw new NotFoundException('VIP tier not found');
    }

    return this.toVipTierResponse(tier);
  }

  async createVipTier(dto: CreateVipTierDto) {
    const result = await this.databaseService.query<VipTierRow>(
      `
        INSERT INTO vip_tiers (
          name,
          slug,
          price,
          daily_earnings,
          daily_tasks_count,
          duration_days,
          is_active,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        dto.name,
        dto.slug,
        dto.price.toFixed(2),
        dto.dailyEarnings.toFixed(2),
        dto.dailyTasksCount,
        dto.durationDays ?? 30,
        dto.isActive ?? true,
        dto.sortOrder ?? 0,
      ],
    );

    return this.toVipTierResponse(result.rows[0]);
  }

  async updateVipTier(id: string, dto: UpdateVipTierDto) {
    await this.assertVipTierExists(id);

    const fields: string[] = [];
    const params: unknown[] = [];

    if (dto.name !== undefined) {
      params.push(dto.name);
      fields.push(`name = $${params.length}`);
    }
    if (dto.slug !== undefined) {
      params.push(dto.slug);
      fields.push(`slug = $${params.length}`);
    }
    if (dto.price !== undefined) {
      params.push(dto.price.toFixed(2));
      fields.push(`price = $${params.length}`);
    }
    if (dto.dailyEarnings !== undefined) {
      params.push(dto.dailyEarnings.toFixed(2));
      fields.push(`daily_earnings = $${params.length}`);
    }
    if (dto.dailyTasksCount !== undefined) {
      params.push(dto.dailyTasksCount);
      fields.push(`daily_tasks_count = $${params.length}`);
    }
    if (dto.durationDays !== undefined) {
      params.push(dto.durationDays);
      fields.push(`duration_days = $${params.length}`);
    }
    if (dto.isActive !== undefined) {
      params.push(dto.isActive);
      fields.push(`is_active = $${params.length}`);
    }
    if (dto.sortOrder !== undefined) {
      params.push(dto.sortOrder);
      fields.push(`sort_order = $${params.length}`);
    }

    if (fields.length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    params.push(id);
    const result = await this.databaseService.query<VipTierRow>(
      `
        UPDATE vip_tiers
        SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
      `,
      params,
    );

    return this.toVipTierResponse(result.rows[0]);
  }

  async deactivateVipTier(id: string) {
    const result = await this.databaseService.query<VipTierRow>(
      `
        UPDATE vip_tiers
        SET is_active = false
        WHERE id = $1
        RETURNING *
      `,
      [id],
    );

    const tier = result.rows[0];
    if (!tier) {
      throw new NotFoundException('VIP tier not found');
    }

    return this.toVipTierResponse(tier);
  }

  async getUserSubscriptions(userId: string) {
    const result = await this.databaseService.query<SubscriptionRow>(
      `
        SELECT s.*, v.name AS tier_name, v.slug AS tier_slug
        FROM subscriptions s
        JOIN vip_tiers v ON v.id = s.vip_tier_id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => this.toSubscriptionResponse(row));
  }

  async listSubscriptions(query: ListSubscriptionsQueryDto) {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (query.userId) {
      params.push(query.userId);
      clauses.push(`s.user_id = $${params.length}`);
    }
    if (query.vipTierId) {
      params.push(query.vipTierId);
      clauses.push(`s.vip_tier_id = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      clauses.push(`s.status = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.databaseService.query<SubscriptionRow>(
      `
        SELECT s.*, v.name AS tier_name, v.slug AS tier_slug
        FROM subscriptions s
        JOIN vip_tiers v ON v.id = s.vip_tier_id
        ${whereClause}
        ORDER BY s.created_at DESC
      `,
      params,
    );

    return result.rows.map((row) => this.toSubscriptionResponse(row));
  }

  async handleDepositApproved(event: DepositApprovedEvent) {
    const existingSubscription = await this.databaseService.query<{ id: string }>(
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

    if (existingSubscription.rows[0]) {
      this.logger.warn(
        `Skipping duplicate subscription creation for user ${event.userId} and tier ${event.vipTierId}`,
      );
      return this.getSubscriptionById(existingSubscription.rows[0].id);
    }

    const tier = await this.databaseService.query<VipTierRow>(
      `
        SELECT *
        FROM vip_tiers
        WHERE id = $1
        LIMIT 1
      `,
      [event.vipTierId],
    );

    const vipTier = tier.rows[0];
    if (!vipTier) {
      throw new NotFoundException('VIP tier not found for approved deposit');
    }

    const result = await this.databaseService.query<SubscriptionRow>(
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
        RETURNING *, NULL::TEXT AS tier_name, NULL::TEXT AS tier_slug
      `,
      [event.userId, event.vipTierId, vipTier.duration_days, vipTier.daily_earnings],
    );

    const subscription = result.rows[0];

    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.TASKS,
      RABBITMQ_QUEUES.SUBSCRIPTION_CREATED,
      {
        userId: event.userId,
        vipTierId: event.vipTierId,
        subscriptionId: subscription.id,
        dailyEarnings: Number(subscription.daily_earnings),
      },
    );

    const notifyEvent: NotifyUserEvent = {
      userId: event.userId,
      title: 'VIP Activated',
      message: `${vipTier.name} is now active. Your daily tasks are live.`,
      type: 'vip_activated',
    };

    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.NOTIFS,
      RABBITMQ_QUEUES.NOTIFY_USER,
      notifyEvent,
    );

    return this.toSubscriptionResponse({
      ...subscription,
      tier_name: vipTier.name,
      tier_slug: vipTier.slug,
    });
  }

  private async assertVipTierExists(id: string): Promise<void> {
    const result = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM vip_tiers
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('VIP tier not found');
    }
  }

  private async getSubscriptionById(id: string) {
    const result = await this.databaseService.query<SubscriptionRow>(
      `
        SELECT s.*, v.name AS tier_name, v.slug AS tier_slug
        FROM subscriptions s
        JOIN vip_tiers v ON v.id = s.vip_tier_id
        WHERE s.id = $1
        LIMIT 1
      `,
      [id],
    );

    const subscription = result.rows[0];
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.toSubscriptionResponse(subscription);
  }

  private toVipTierResponse(row: VipTierRow) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      dailyEarnings: Number(row.daily_earnings),
      dailyTasksCount: row.daily_tasks_count,
      durationDays: row.duration_days,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    };
  }

  private toSubscriptionResponse(row: SubscriptionRow) {
    return {
      id: row.id,
      userId: row.user_id,
      vipTierId: row.vip_tier_id,
      status: row.status,
      startedAt: row.started_at,
      expiresAt: row.expires_at,
      dailyEarnings: Number(row.daily_earnings),
      createdAt: row.created_at,
      tierName: row.tier_name ?? null,
      tierSlug: row.tier_slug ?? null,
    };
  }
}
