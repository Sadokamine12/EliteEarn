CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID REFERENCES refresh_tokens(id),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);
