WITH ranked AS (
  SELECT
    id,
    user_id,
    vip_tier_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, vip_tier_id
      ORDER BY created_at DESC, started_at DESC, id DESC
    ) AS row_num
  FROM subscriptions
)
UPDATE subscriptions
SET status = 'cancelled'
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_tier_active_unique_idx
ON subscriptions (user_id, vip_tier_id)
WHERE status = 'active';
