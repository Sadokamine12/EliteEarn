import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, connect } from 'amqplib';
import { RABBITMQ_EXCHANGES } from './constants';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      this.logger.warn('RABBITMQ_URL is not set. Event publishing is disabled.');
      return;
    }

    try {
      const connection = await connect(url);
      const channel = await connection.createChannel();

      for (const exchange of Object.values(RABBITMQ_EXCHANGES)) {
        await channel.assertExchange(exchange, 'topic', { durable: true });
      }

      this.connection = connection;
      this.channel = channel;
    } catch (error) {
      this.logger.error(
        'Failed to initialize RabbitMQ connection',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async publish<T>(exchange: string, routingKey: string, payload: T): Promise<boolean> {
    if (!this.channel) {
      this.logger.warn(`Dropping RabbitMQ message for ${routingKey}; channel unavailable.`);
      return false;
    }

    return this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
