import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { CreateVipTierDto } from './dto/create-vip-tier.dto';
import { UpdateVipTierDto } from './dto/update-vip-tier.dto';
import { VipService } from './vip.service';

@Controller('vip-tiers')
export class VipTiersController {
  constructor(private readonly vipService: VipService) {}

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAllVipTiers() {
    return this.vipService.listVipTiers(true);
  }

  @Get()
  getVipTiers() {
    return this.vipService.listVipTiers();
  }

  @Get(':id')
  getVipTier(@Param('id') id: string) {
    return this.vipService.getVipTier(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createVipTier(@Body() dto: CreateVipTierDto) {
    return this.vipService.createVipTier(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateVipTier(@Param('id') id: string, @Body() dto: UpdateVipTierDto) {
    return this.vipService.updateVipTier(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deactivateVipTier(@Param('id') id: string) {
    return this.vipService.deactivateVipTier(id);
  }
}
