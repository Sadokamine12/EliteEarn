import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@app/common';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: { sub: string }) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: { sub: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Post('me/claim-welcome-bonus')
  claimWelcomeBonus(@CurrentUser() user: { sub: string }) {
    return this.usersService.claimWelcomeBonus(user.sub);
  }

  @Get()
  @Roles('admin')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(':id')
  @Roles('admin')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles('admin')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto);
  }

  @Patch(':id/balance')
  @Roles('admin')
  adjustBalance(@Param('id') id: string, @Body() dto: AdjustBalanceDto) {
    return this.usersService.adjustBalance(id, dto);
  }
}
