import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, RolesGuard } from '@app/common';
import { WalletService } from './wallet.service';

@Controller('balance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BalanceController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getBalance(@CurrentUser() user: { sub: string }) {
    return this.walletService.getBalance(user.sub);
  }

  @Get('history')
  getHistory(@CurrentUser() user: { sub: string }) {
    return this.walletService.getBalanceHistory(user.sub);
  }
}
