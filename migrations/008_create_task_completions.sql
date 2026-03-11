CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, task_id, date)
);

CREATE INDEX IF NOT EXISTS task_completions_user_id_idx ON task_completions (user_id, date DESC);
