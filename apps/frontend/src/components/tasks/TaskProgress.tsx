import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { TaskProgress as TaskProgressType } from '@/types';

export const TaskProgress = ({ progress }: { progress: TaskProgressType | null }) => (
  <Card className="mx-4 mb-5 p-4">
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-brand-cyan">Daily progress</p>
        <h2 className="text-xl font-semibold text-white">
          {progress?.completed ?? 0} / {progress?.total ?? 0} tasks complete
        </h2>
      </div>
      <div className="text-right">
        <p className="text-sm text-slate-400">Claimable</p>
        <p className="text-lg font-semibold text-white">{formatCurrency(progress?.totalReward ?? 0)}</p>
      </div>
    </div>
    <ProgressBar value={progress?.percentage ?? 0} label="Completion" />
  </Card>
);
