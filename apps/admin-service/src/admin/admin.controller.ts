import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { AdminService } from './admin.service';
import { BroadcastDto } from './dto/broadcast.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('deposits')
  getDeposits(@Query() query: ListLedgerQueryDto) {
    return this.adminService.listDeposits(query);
  }

  @Get('withdrawals')
  getWithdrawals(@Query() query: ListLedgerQueryDto) {
    return this.adminService.listWithdrawals(query);
  }

  @Get('promotions')
  getPromotions() {
    return this.adminService.listPromotions();
  }

  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.adminService.createPromotion(dto);
  }

  @Patch('promotions/:id')
  updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.adminService.updatePromotion(id, dto);
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() payload: Record<string, string>) {
    return this.adminService.updateSettings(payload);
  }

  @Post('broadcast')
  broadcast(@Body() dto: BroadcastDto) {
    return this.adminService.broadcast(dto);
  }
}
