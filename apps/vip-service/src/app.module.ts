import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { RabbitMqModule } from '@app/rabbitmq';
import { VipModule } from './vip/vip.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    RabbitMqModule,
    VipModule,
  ],
})
export class AppModule {}
