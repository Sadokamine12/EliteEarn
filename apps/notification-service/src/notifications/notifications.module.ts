import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotifyUserConsumer } from './notify-user.consumer';

@Module({
  imports: [PassportModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, JwtStrategy, NotifyUserConsumer],
})
export class NotificationsModule {}
