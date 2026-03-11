import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { RabbitMqModule } from '@app/rabbitmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    RabbitMqModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
