import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { WalletService } from './wallet.service';

@Controller('deposits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepositsController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  createDeposit(@CurrentUser() user: { sub: string }, @Body() dto: CreateDepositDto) {
    return this.walletService.createDeposit(user.sub, dto);
  }

  @Get()
  getMyDeposits(@CurrentUser() user: { sub: string }) {
    return this.walletService.getDeposits(user.sub);
  }

  @Get('pending')
  @Roles('admin')
  getPendingDeposits() {
    return this.walletService.getPendingDeposits();
  }

  @Patch(':id/approve')
  @Roles('admin')
  approveDeposit(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.walletService.approveDeposit(id, user.sub);
  }

  @Patch(':id/reject')
  @Roles('admin')
  rejectDeposit(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.walletService.rejectDeposit(id, user.sub);
  }
}
