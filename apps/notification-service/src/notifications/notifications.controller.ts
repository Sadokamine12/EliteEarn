import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, RolesGuard } from '@app/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.getNotifications(user.sub);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  @Patch('mark-all-read')
  markAllRead(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }
}
