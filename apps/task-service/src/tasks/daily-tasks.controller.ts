import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, RolesGuard } from '@app/common';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DailyTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('today')
  getTodayTasks(@CurrentUser() user: { sub: string }) {
    return this.tasksService.getTodayTasks(user.sub);
  }

  @Post(':id/complete')
  completeTask(
    @CurrentUser() user: { sub: string },
    @Param('id') taskId: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.tasksService.completeTask(user.sub, taskId, dto);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: { sub: string }) {
    return this.tasksService.getTaskProgress(user.sub);
  }

  @Post('claim-reward')
  claimReward(@CurrentUser() user: { sub: string }) {
    return this.tasksService.claimReward(user.sub);
  }

  @Get('history')
  getHistory(@CurrentUser() user: { sub: string }) {
    return this.tasksService.getTaskHistory(user.sub);
  }
}
