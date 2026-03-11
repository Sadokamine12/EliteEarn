import { useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TopBar } from '@/components/layout/TopBar';
import { ClaimButton } from '@/components/tasks/ClaimButton';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskProgress } from '@/components/tasks/TaskProgress';
import { ActiveSubscriptions } from '@/components/vip/ActiveSubscriptions';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useTaskStore } from '@/store/task.store';
import { useVipStore } from '@/store/vip.store';

export const TaskCenterPage = () => {
  const tasks = useTaskStore((state) => state.tasks);
  const progress = useTaskStore((state) => state.progress);
  const rewardClaimed = useTaskStore((state) => state.rewardClaimed);
  const loading = useTaskStore((state) => state.loading);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const completeTask = useTaskStore((state) => state.completeTask);
  const claimReward = useTaskStore((state) => state.claimReward);
  const resetRewardState = useTaskStore((state) => state.resetRewardState);
  const subscriptions = useVipStore((state) => state.subscriptions);
  const fetchStoreData = useVipStore((state) => state.fetchStoreData);

  useEffect(() => {
    resetRewardState();
    void fetchStoreData();
    void fetchTasks();
  }, [fetchStoreData, fetchTasks, resetRewardState]);

  return (
    <MobileLayout>
      <TopBar />
      <div className="px-4 pb-4 pt-1">
        <h1 className="text-2xl font-semibold text-white">Task Center</h1>
        <p className="mt-1 text-sm text-slate-400">Clear the board, then claim the reward bundle when the meter hits 100%.</p>
      </div>

      {subscriptions.length > 0 ? <ActiveSubscriptions subs={subscriptions} showBonus /> : null}

      <TaskProgress progress={progress} />

      <div className="flex flex-col gap-3 px-4">
        {loading ? (
          <Card className="p-6 text-sm text-slate-400">Loading tasks...</Card>
        ) : tasks.length === 0 ? (
          <Card className="p-6 text-sm text-slate-400">No tasks assigned yet. Activate a tier to unlock the queue.</Card>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={(rating, reviewText) => completeTask(task.id, { rating, reviewText })}
            />
          ))
        )}
      </div>

      {progress?.canClaim && !rewardClaimed ? (
        <ClaimButton reward={progress.totalReward} onClaim={claimReward} />
      ) : null}

      {rewardClaimed ? (
        <div className="px-4 pt-4">
          <Card className="bg-gradient-to-br from-brand-green/20 via-transparent to-brand-cyan/15 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Reward secured</p>
            <h3 className="mt-3 text-3xl font-semibold text-white">{formatCurrency(progress?.totalReward ?? 0)}</h3>
            <p className="mt-2 text-sm text-slate-300">The claim event has been sent to your wallet ledger.</p>
          </Card>
        </div>
      ) : null}
    </MobileLayout>
  );
};
