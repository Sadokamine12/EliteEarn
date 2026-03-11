import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AdminTasksController } from './admin-tasks.controller';
import { DailyTasksController } from './daily-tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PassportModule],
  controllers: [DailyTasksController, AdminTasksController],
  providers: [TasksService, JwtStrategy],
})
export class TasksModule {}
