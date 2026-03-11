CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by UUID REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('user', 'admin')),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'banned'))
);

CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users (referred_by);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC);
