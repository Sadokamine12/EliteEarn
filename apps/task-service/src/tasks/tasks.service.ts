import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '@app/database';
import {
  NotifyUserEvent,
  RabbitMqService,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RewardClaimedEvent,
  TaskCompletedEvent,
} from '@app/rabbitmq';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

interface ActiveTaskRow {
  id: string;
  vip_tier_id: string;
  title: string;
  description: string | null;
  type: 'review' | 'rating' | 'survey' | 'ad';
  product_name: string | null;
  product_image_url: string | null;
  target_url: string | null;
  task_reward: string | null;
  subscription_id: string;
  daily_earnings: string;
  daily_tasks_count: number;
  completed: boolean;
  completed_at: string | null;
}

interface TaskRow {
  id: string;
  vip_tier_id: string;
  title: string;
  description: string | null;
  type: 'review' | 'rating' | 'survey' | 'ad';
  product_name: string | null;
  product_image_url: string | null;
  target_url: string | null;
  reward: string | null;
  is_active: boolean;
  created_at: string;
}

interface HistoryRow {
  id: string;
  task_id: string;
  subscription_id: string;
  title: string;
  rating: number | null;
  review_text: string | null;
  completed_at: string;
  date: string;
}

interface RewardClaimRow {
  subscription_id: string;
}

interface QueryExecutor {
  query<T = unknown>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  async getTodayTasks(userId: string) {
    const assignments = await this.getTodayAssignments(userId);
    return assignments.map((row) => this.toTaskResponse(row));
  }

  async completeTask(userId: string, taskId: string, dto: CompleteTaskDto) {
    const assignments = await this.getTodayAssignments(userId);
    const task = assignments.find((row) => row.id === taskId);

    if (!task) {
      throw new NotFoundException('Task not found for today');
    }

    if (task.completed) {
      throw new BadRequestException('Task already completed today');
    }

    await this.databaseService.query(
      `
        INSERT INTO task_completions (
          user_id,
          task_id,
          subscription_id,
          rating,
          review_text,
          completed_at,
          date
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), CURRENT_DATE)
      `,
      [userId, taskId, task.subscription_id, dto.rating ?? null, dto.reviewText ?? null],
    );

    const reward = this.getRewardValue(task);
    const event: TaskCompletedEvent = {
      userId,
      taskId,
      subscriptionId: task.subscription_id,
      reward,
    };

    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGES.TASKS,
      RABBITMQ_QUEUES.TASK_COMPLETED,
      event,
    );

    return {
      taskId,
      completed: true,
      reward,
    };
  }

  async getTaskProgress(userId: string) {
    const assignments = await this.getTodayAssignments(userId);
    const claimedSubscriptionIds = await this.getClaimedSubscriptionIds(
      userId,
      assignments.map((assignment) => assignment.subscription_id),
    );

    const total = assignments.length;
    const completed = assignments.filter((assignment) => assignment.completed).length;
    const claimableAssignments = assignments.filter(
      (assignment) => !claimedSubscriptionIds.has(assignment.subscription_id),
    );
    const totalReward = claimableAssignments.reduce(
      (sum, assignment) => sum + this.getRewardValue(assignment),
      0,
    );

    return {
      completed,
      total,
      percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
      canClaim: total > 0 && completed === total && totalReward > 0,
      totalReward: Number(totalReward.toFixed(2)),
    };
  }

  async claimReward(userId: string) {
    const assignments = await this.getTodayAssignments(userId);

    if (assignments.length === 0) {
      throw new BadRequestException('No tasks available to claim');
    }

    const incomplete = assignments.find((assignment) => !assignment.completed);
    if (incomplete) {
      throw new BadRequestException('Complete all tasks before claiming rewards');
    }

    const claimedSubscriptionIds = await this.getClaimedSubscriptionIds(
      userId,
      assignments.map((assignment) => assignment.subscription_id),
    );

    const groupedRewards = new Map<string, number>();
    for (const assignment of assignments) {
      if (claimedSubscriptionIds.has(assignment.subscription_id)) {
        continue;
      }

      const nextReward = groupedRewards.get(assignment.subscription_id) ?? 0;
      groupedRewards.set(
        assignment.subscription_id,
        Number((nextReward + this.getRewardValue(assignment)).toFixed(2)),
      );
    }

    if (groupedRewards.size === 0) {
      throw new BadRequestException('Reward already claimed for today');
    }

    const today = new Date().toISOString().slice(0, 10);
    let totalReward = 0;

    for (const [subscriptionId, amount] of groupedRewards.entries()) {
      totalReward += amount;

      if (process.env.RABBITMQ_URL) {
        const event: RewardClaimedEvent = {
          userId,
          subscriptionId,
          totalReward: amount,
          date: today,
        };

        await this.rabbitMqService.publish(
          RABBITMQ_EXCHANGES.WALLETS,
          RABBITMQ_QUEUES.REWARD_CLAIMED,
          event,
        );
      }
    }

    if (!process.env.RABBITMQ_URL) {
      totalReward = await this.applyLocalRewardClaim(userId, groupedRewards, today);
    }

    const notifyEvent: NotifyUserEvent = {
      userId,
      title: 'Reward Claimed',
      message: `Daily reward credited: $${totalReward.toFixed(2)}`,
      type: 'reward_claimed',
    };

    if (process.env.RABBITMQ_URL) {
      await this.rabbitMqService.publish(
        RABBITMQ_EXCHANGES.NOTIFS,
        RABBITMQ_QUEUES.NOTIFY_USER,
        notifyEvent,
      );
    } else {
      await this.insertNotification(userId, notifyEvent.title, notifyEvent.message, notifyEvent.type);
    }

    return {
      reward: Number(totalReward.toFixed(2)),
    };
  }

  async getTaskHistory(userId: string) {
    const result = await this.databaseService.query<HistoryRow>(
      `
        SELECT tc.id, tc.task_id, tc.subscription_id, t.title, tc.rating, tc.review_text, tc.completed_at, tc.date::TEXT AS date
        FROM task_completions tc
        JOIN tasks t ON t.id = tc.task_id
        WHERE tc.user_id = $1
        ORDER BY tc.completed_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      subscriptionId: row.subscription_id,
      title: row.title,
      rating: row.rating,
      reviewText: row.review_text,
      completedAt: row.completed_at,
      date: row.date,
    }));
  }

  async listAllTasks() {
    const result = await this.databaseService.query<TaskRow>(
      `
        SELECT *
        FROM tasks
        ORDER BY created_at DESC
      `,
    );

    return result.rows.map((row) => this.toAdminTaskResponse(row));
  }

  async createTask(dto: CreateTaskDto) {
    const result = await this.databaseService.query<TaskRow>(
      `
        INSERT INTO tasks (
          vip_tier_id,
          title,
          description,
          type,
          product_name,
          product_image_url,
          target_url,
          reward,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        dto.vipTierId,
        dto.title,
        dto.description ?? null,
        dto.type,
        dto.productName ?? null,
        dto.productImageUrl ?? null,
        dto.targetUrl ?? null,
        dto.reward?.toFixed(4) ?? null,
        dto.isActive ?? true,
      ],
    );

    return this.toAdminTaskResponse(result.rows[0]);
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (dto.vipTierId !== undefined) {
      params.push(dto.vipTierId);
      fields.push(`vip_tier_id = $${params.length}`);
    }
    if (dto.title !== undefined) {
      params.push(dto.title);
      fields.push(`title = $${params.length}`);
    }
    if (dto.description !== undefined) {
      params.push(dto.description);
      fields.push(`description = $${params.length}`);
    }
    if (dto.type !== undefined) {
      params.push(dto.type);
      fields.push(`type = $${params.length}`);
    }
    if (dto.productName !== undefined) {
      params.push(dto.productName);
      fields.push(`product_name = $${params.length}`);
    }
    if (dto.productImageUrl !== undefined) {
      params.push(dto.productImageUrl);
      fields.push(`product_image_url = $${params.length}`);
    }
    if (dto.targetUrl !== undefined) {
      params.push(dto.targetUrl);
      fields.push(`target_url = $${params.length}`);
    }
    if (dto.reward !== undefined) {
      params.push(dto.reward.toFixed(4));
      fields.push(`reward = $${params.length}`);
    }
    if (dto.isActive !== undefined) {
      params.push(dto.isActive);
      fields.push(`is_active = $${params.length}`);
    }

    if (fields.length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    params.push(id);
    const result = await this.databaseService.query<TaskRow>(
      `
        UPDATE tasks
        SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
      `,
      params,
    );

    const task = result.rows[0];
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.toAdminTaskResponse(task);
  }

  async deleteTask(id: string) {
    const result = await this.databaseService.query<TaskRow>(
      `
        UPDATE tasks
        SET is_active = false
        WHERE id = $1
        RETURNING *
      `,
      [id],
    );

    const task = result.rows[0];
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.toAdminTaskResponse(task);
  }

  private async getTodayAssignments(userId: string) {
    const result = await this.databaseService.query<ActiveTaskRow>(
      `
        SELECT
          t.id,
          t.vip_tier_id,
          t.title,
          t.description,
          t.type,
          t.product_name,
          t.product_image_url,
          t.target_url,
          t.reward AS task_reward,
          s.id AS subscription_id,
          s.daily_earnings,
          vt.daily_tasks_count,
          (tc.id IS NOT NULL) AS completed,
          tc.completed_at
        FROM subscriptions s
        JOIN vip_tiers vt ON vt.id = s.vip_tier_id
        JOIN tasks t ON t.vip_tier_id = s.vip_tier_id AND t.is_active = true
        LEFT JOIN task_completions tc
          ON tc.user_id = $1
         AND tc.task_id = t.id
         AND tc.date = CURRENT_DATE
        WHERE s.user_id = $1
          AND s.status = 'active'
          AND s.expires_at > NOW()
        ORDER BY vt.sort_order ASC, t.created_at ASC
      `,
      [userId],
    );

    return result.rows;
  }

  private async getClaimedSubscriptionIds(userId: string, subscriptionIds: string[]) {
    if (subscriptionIds.length === 0) {
      return new Set<string>();
    }

    const result = await this.databaseService.query<RewardClaimRow>(
      `
        SELECT subscription_id
        FROM reward_claims
        WHERE user_id = $1
          AND claim_date = CURRENT_DATE
          AND subscription_id = ANY($2::UUID[])
      `,
      [userId, subscriptionIds],
    );

    return new Set(result.rows.map((row) => row.subscription_id));
  }

  private getRewardValue(row: ActiveTaskRow) {
    if (row.task_reward !== null) {
      return Number(row.task_reward);
    }

    return Number((Number(row.daily_earnings) / row.daily_tasks_count).toFixed(4));
  }

  private async applyLocalRewardClaim(
    userId: string,
    groupedRewards: Map<string, number>,
    claimDate: string,
  ) {
    return this.databaseService.transaction(async (client) => {
      await this.ensureBalance(userId, client);

      let creditedTotal = 0;

      for (const [subscriptionId, amount] of groupedRewards.entries()) {
        const insertResult = await client.query<{ id: string }>(
          `
            INSERT INTO reward_claims (user_id, subscription_id, amount, claim_date)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, subscription_id, claim_date) DO NOTHING
            RETURNING id
          `,
          [userId, subscriptionId, amount.toFixed(2), claimDate],
        );

        if (insertResult.rowCount) {
          creditedTotal += amount;
        }
      }

      if (creditedTotal === 0) {
        throw new BadRequestException('Reward already claimed for today');
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
        [userId, creditedTotal.toFixed(2)],
      );

      return Number(creditedTotal.toFixed(2));
    });
  }

  private async ensureBalance(userId: string, executor: QueryExecutor) {
    await executor.query(
      `
        INSERT INTO balances (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId],
    );
  }

  private async insertNotification(userId: string, title: string, message: string, type: string) {
    await this.databaseService.query(
      `
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
      `,
      [userId, title, message, type],
    );
  }

  private toTaskResponse(row: ActiveTaskRow) {
    return {
      id: row.id,
      vipTierId: row.vip_tier_id,
      subscriptionId: row.subscription_id,
      title: row.title,
      description: row.description,
      type: row.type,
      productName: row.product_name,
      productImageUrl: row.product_image_url,
      targetUrl: row.target_url,
      reward: this.getRewardValue(row),
      completed: row.completed,
      completedAt: row.completed_at,
    };
  }

  private toAdminTaskResponse(row: TaskRow) {
    return {
      id: row.id,
      vipTierId: row.vip_tier_id,
      title: row.title,
      description: row.description,
      type: row.type,
      productName: row.product_name,
      productImageUrl: row.product_image_url,
      targetUrl: row.target_url,
      reward: row.reward === null ? null : Number(row.reward),
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
