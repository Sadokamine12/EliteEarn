import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { NotifyUserEvent } from '@app/rabbitmq';

interface NotificationRow {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getNotifications(userId: string) {
    const result = await this.databaseService.query<NotificationRow>(
      `
        SELECT *
        FROM notifications
        WHERE user_id = $1 OR user_id IS NULL
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => this.toNotificationResponse(row));
  }

  async getUnreadCount(userId: string) {
    const result = await this.databaseService.query<{ count: string }>(
      `
        SELECT COUNT(*)::TEXT AS count
        FROM notifications
        WHERE (user_id = $1 OR user_id IS NULL)
          AND is_read = false
      `,
      [userId],
    );

    return {
      count: Number(result.rows[0]?.count ?? 0),
    };
  }

  async markAllRead(userId: string) {
    await this.databaseService.query(
      `
        UPDATE notifications
        SET is_read = true
        WHERE user_id = $1 OR user_id IS NULL
      `,
      [userId],
    );

    return {
      success: true,
    };
  }

  async markRead(userId: string, id: string) {
    const result = await this.databaseService.query<NotificationRow>(
      `
        UPDATE notifications
        SET is_read = true
        WHERE id = $1
          AND (user_id = $2 OR user_id IS NULL)
        RETURNING *
      `,
      [id, userId],
    );

    const notification = result.rows[0];
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.toNotificationResponse(notification);
  }

  async createNotification(payload: NotifyUserEvent) {
    const result = await this.databaseService.query<NotificationRow>(
      `
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [payload.userId, payload.title, payload.message, payload.type],
    );

    return this.toNotificationResponse(result.rows[0]);
  }

  private toNotificationResponse(row: NotificationRow) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      message: row.message,
      type: row.type,
      isRead: row.is_read,
      createdAt: row.created_at,
    };
  }
}
