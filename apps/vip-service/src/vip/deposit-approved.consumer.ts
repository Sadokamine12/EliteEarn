import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { DepositApprovedEvent, RABBITMQ_EXCHANGES, RABBITMQ_QUEUES } from '@app/rabbitmq';
import { VipService } from './vip.service';

@Injectable()
export class DepositApprovedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DepositApprovedConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly vipService: VipService) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      this.logger.warn('RABBITMQ_URL is not set. Deposit consumer is disabled.');
      return;
    }

    try {
      const connection = await connect(url);
      const channel = await connection.createChannel();

      await channel.assertExchange(RABBITMQ_EXCHANGES.DEPOSITS, 'topic', { durable: true });
      await channel.assertQueue(RABBITMQ_QUEUES.DEPOSIT_APPROVED, { durable: true });
      await channel.bindQueue(
        RABBITMQ_QUEUES.DEPOSIT_APPROVED,
        RABBITMQ_EXCHANGES.DEPOSITS,
        RABBITMQ_QUEUES.DEPOSIT_APPROVED,
      );

      await channel.consume(RABBITMQ_QUEUES.DEPOSIT_APPROVED, (message) => {
        void this.handleMessage(channel, message);
      });

      this.connection = connection;
      this.channel = channel;
      this.logger.log('Deposit-approved consumer is listening');
    } catch (error) {
      this.logger.error(
        'Failed to initialize deposit-approved consumer',
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
      const payload = JSON.parse(message.content.toString()) as DepositApprovedEvent;
      await this.vipService.handleDepositApproved(payload);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        'Failed to process deposit-approved message',
        error instanceof Error ? error.stack : String(error),
      );
      channel.nack(message, false, false);
    }
  }
}
