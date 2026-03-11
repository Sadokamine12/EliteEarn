import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { NotifyUserEvent, RABBITMQ_EXCHANGES, RABBITMQ_QUEUES } from '@app/rabbitmq';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotifyUserConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotifyUserConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly notificationsService: NotificationsService) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      this.logger.warn('RABBITMQ_URL is not set. Notify-user consumer is disabled.');
      return;
    }

    try {
      const connection = await connect(url);
      const channel = await connection.createChannel();

      await channel.assertExchange(RABBITMQ_EXCHANGES.NOTIFS, 'topic', { durable: true });
      await channel.assertQueue(RABBITMQ_QUEUES.NOTIFY_USER, { durable: true });
      await channel.bindQueue(
        RABBITMQ_QUEUES.NOTIFY_USER,
        RABBITMQ_EXCHANGES.NOTIFS,
        RABBITMQ_QUEUES.NOTIFY_USER,
      );

      await channel.consume(RABBITMQ_QUEUES.NOTIFY_USER, (message) => {
        void this.handleMessage(channel, message);
      });

      this.connection = connection;
      this.channel = channel;
      this.logger.log('Notify-user consumer is listening');
    } catch (error) {
      this.logger.error(
        'Failed to initialize notify-user consumer',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(channel: Channel, message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }

    try {
      const payload = JSON.parse(message.content.toString()) as NotifyUserEvent;
      await this.notificationsService.createNotification(payload);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        'Failed to process notify-user message',
        error instanceof Error ? error.stack : String(error),
      );
      channel.nack(message, false, false);
    }
  }
}
