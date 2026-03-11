import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, RewardClaimedEvent } from '@app/rabbitmq';
import { WalletService } from './wallet.service';

@Injectable()
export class RewardClaimsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RewardClaimsConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly walletService: WalletService) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      this.logger.warn('RABBITMQ_URL is not set. Reward claim consumer is disabled.');
      return;
    }

    try {
      const connection = await connect(url);
      const channel = await connection.createChannel();

      await channel.assertExchange(RABBITMQ_EXCHANGES.WALLETS, 'topic', { durable: true });
      await channel.assertQueue(RABBITMQ_QUEUES.REWARD_CLAIMED, { durable: true });
      await channel.bindQueue(
        RABBITMQ_QUEUES.REWARD_CLAIMED,
        RABBITMQ_EXCHANGES.WALLETS,
        RABBITMQ_QUEUES.REWARD_CLAIMED,
      );

      await channel.consume(RABBITMQ_QUEUES.REWARD_CLAIMED, (message) => {
        void this.handleMessage(channel, message);
      });

      this.connection = connection;
      this.channel = channel;
      this.logger.log('Reward claim consumer is listening');
    } catch (error) {
      this.logger.error(
        'Failed to initialize reward claim consumer',
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
      const payload = JSON.parse(message.content.toString()) as RewardClaimedEvent;
      await this.walletService.applyRewardClaim(payload);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        'Failed to process reward claim message',
        error instanceof Error ? error.stack : String(error),
      );
      channel.nack(message, false, false);
    }
  }
}
