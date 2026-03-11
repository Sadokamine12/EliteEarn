import { Controller, Get } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('deposit-wallets')
export class PublicDepositsController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getDepositWallets() {
    return this.walletService.getDepositWallets();
  }
}
