import { useState } from 'react';
import { ExternalLink, MessageSquareText, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onComplete: (rating?: number, reviewText?: string) => Promise<void>;
}

export const TaskCard = ({ task, onComplete }: TaskCardProps) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onComplete(task.type === 'rating' ? rating : rating, review || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={task.completed ? 'green' : 'amber'}>{task.completed ? 'Done' : task.type}</Badge>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Reward {formatCurrency(task.reward ?? 0)}</span>
          </div>
          <h3 className="text-lg font-semibold text-white">{task.title}</h3>
          {task.description ? <p className="mt-1 text-sm text-slate-400">{task.description}</p> : null}
          {task.targetUrl ? (
            <a
              href={task.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-cyan transition hover:text-cyan-200"
            >
              Open app listing
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
        {task.productImageUrl ? (
          <img src={task.productImageUrl} alt={task.productName ?? task.title} className="h-16 w-16 rounded-2xl object-cover" />
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => {
          const active = index < rating;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setRating(index + 1)}
              className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
            >
              <Star className={active ? 'h-4 w-4 fill-brand-yellow text-brand-yellow' : 'h-4 w-4 text-slate-500'} />
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
          <MessageSquareText className="h-4 w-4 text-brand-cyan" />
          App review note
        </span>
        <textarea
          value={review}
          onChange={(event) => setReview(event.target.value)}
          rows={3}
          placeholder="Leave a short app-store style review summary."
          className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-orange/40"
        />
      </label>

      <Button className="mt-4 w-full" onClick={handleSubmit} disabled={task.completed || submitting}>
        {task.completed ? 'Completed' : submitting ? 'Submitting...' : 'Submit task'}
      </Button>
    </Card>
  );
};
