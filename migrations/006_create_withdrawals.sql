CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(18,2) NOT NULL,
  wallet_address TEXT NOT NULL,
  crypto VARCHAR(20) NOT NULL DEFAULT 'USDT_BEP20',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT withdrawals_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON withdrawals (user_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals (status);
