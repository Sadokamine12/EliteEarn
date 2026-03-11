import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { RabbitMqModule } from '@app/rabbitmq';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    RabbitMqModule,
    WalletModule,
  ],
})
export class AppModule {}
