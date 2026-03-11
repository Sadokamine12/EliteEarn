import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { DepositApprovedConsumer } from './deposit-approved.consumer';
import { SubscriptionsController } from './subscriptions.controller';
import { VipTiersController } from './vip-tiers.controller';
import { VipService } from './vip.service';

@Module({
  imports: [PassportModule],
  controllers: [VipTiersController, SubscriptionsController],
  providers: [VipService, JwtStrategy, DepositApprovedConsumer],
})
export class VipModule {}
