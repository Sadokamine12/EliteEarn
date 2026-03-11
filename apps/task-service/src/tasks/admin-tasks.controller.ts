import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('tasks')
  getTasks() {
    return this.tasksService.listAllTasks();
  }

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(dto);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto);
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }
}
