CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(18,2) NOT NULL,
  crypto VARCHAR(20) NOT NULL,
  tx_hash TEXT,
  proof_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  vip_tier_id UUID REFERENCES vip_tiers(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deposits_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON deposits (user_id);
CREATE INDEX IF NOT EXISTS deposits_status_idx ON deposits (status);
