CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vip_tier_id UUID NOT NULL REFERENCES vip_tiers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  daily_earnings NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
