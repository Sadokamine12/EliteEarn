import api from './axios';
import type { CompleteTaskDto, Task, TaskProgress } from '@/types';

export const taskApi = {
  getTodayTasks: () => api.get<Task[]>('/api/tasks/today'),
  getProgress: () => api.get<TaskProgress>('/api/tasks/progress'),
  completeTask: (taskId: string, data: CompleteTaskDto) => api.post(`/api/tasks/${taskId}/complete`, data),
  claimReward: () => api.post<{ reward: number }>('/api/tasks/claim-reward'),
};
