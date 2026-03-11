import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { BalanceController } from './balance.controller';
import { DepositsController } from './deposits.controller';
import { PublicDepositsController } from './public-deposits.controller';
import { RewardClaimsConsumer } from './reward-claims.consumer';
import { WalletService } from './wallet.service';
import { WithdrawalsController } from './withdrawals.controller';

@Module({
  imports: [PassportModule],
  controllers: [BalanceController, DepositsController, PublicDepositsController, WithdrawalsController],
  providers: [WalletService, JwtStrategy, RewardClaimsConsumer],
})
export class WalletModule {}
