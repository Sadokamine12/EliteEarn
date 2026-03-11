CREATE TABLE IF NOT EXISTS reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  claim_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subscription_id, claim_date)
);

CREATE INDEX IF NOT EXISTS reward_claims_user_id_idx ON reward_claims (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_claims_subscription_id_idx ON reward_claims (subscription_id);
