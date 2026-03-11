CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  type VARCHAR(30),
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
