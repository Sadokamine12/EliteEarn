import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WalletService } from './wallet.service';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawalsController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  createWithdrawal(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.walletService.createWithdrawal(user.sub, dto);
  }

  @Get()
  getMyWithdrawals(@CurrentUser() user: { sub: string }) {
    return this.walletService.getWithdrawals(user.sub);
  }

  @Get('eligibility')
  getEligibility(@CurrentUser() user: { sub: string }) {
    return this.walletService.getWithdrawalEligibility(user.sub);
  }

  @Get('pending')
  @Roles('admin')
  getPendingWithdrawals() {
    return this.walletService.getPendingWithdrawals();
  }

  @Patch(':id/approve')
  @Roles('admin')
  approveWithdrawal(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.walletService.approveWithdrawal(id, user.sub);
  }

  @Patch(':id/reject')
  @Roles('admin')
  rejectWithdrawal(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.walletService.rejectWithdrawal(id, user.sub);
  }
}
