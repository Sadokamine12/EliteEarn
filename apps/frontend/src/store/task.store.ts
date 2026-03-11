import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { taskApi } from '@/api/task.api';
import { extractErrorMessage } from '@/lib/utils';
import type { CompleteTaskDto, Task, TaskProgress } from '@/types';

interface TaskStore {
  tasks: Task[];
  progress: TaskProgress | null;
  rewardClaimed: boolean;
  loading: boolean;
  fetchTasks: () => Promise<void>;
  completeTask: (taskId: string, data: CompleteTaskDto) => Promise<void>;
  claimReward: () => Promise<number>;
  resetRewardState: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  progress: null,
  rewardClaimed: false,
  loading: false,
  fetchTasks: async () => {
    set({ loading: true });
    try {
      const [tasksResponse, progressResponse] = await Promise.all([
        taskApi.getTodayTasks(),
        taskApi.getProgress(),
      ]);
      set({
        tasks: tasksResponse.data,
        progress: progressResponse.data,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      toast.error(extractErrorMessage(error));
    }
  },
  completeTask: async (taskId, data) => {
    try {
      await taskApi.completeTask(taskId, data);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      }));
      const progressResponse = await taskApi.getProgress();
      set({ progress: progressResponse.data });
      toast.success('Task completed');
    } catch (error) {
      toast.error(extractErrorMessage(error));
      throw error;
    }
  },
  claimReward: async () => {
    try {
      const response = await taskApi.claimReward();
      set({ rewardClaimed: true });
      const progressResponse = await taskApi.getProgress();
      set({ progress: progressResponse.data });
      toast.success(`Reward claimed: $${response.data.reward.toFixed(2)}`);
      return response.data.reward;
    } catch (error) {
      toast.error(extractErrorMessage(error));
      throw error;
    }
  },
  resetRewardState: () => set({ rewardClaimed: false }),
}));
