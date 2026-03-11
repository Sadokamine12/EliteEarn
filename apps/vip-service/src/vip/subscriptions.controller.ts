import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { VipService } from './vip.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly vipService: VipService) {}

  @Get('me')
  getMySubscriptions(@CurrentUser() user: { sub: string }) {
    return this.vipService.getUserSubscriptions(user.sub);
  }

  @Get()
  @Roles('admin')
  getSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    return this.vipService.listSubscriptions(query);
  }
}
