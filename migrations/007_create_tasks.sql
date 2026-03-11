CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_tier_id UUID NOT NULL REFERENCES vip_tiers(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL,
  product_name VARCHAR(255),
  product_image_url TEXT,
  reward NUMERIC(18,4),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_type_check CHECK (type IN ('review', 'rating', 'survey', 'ad'))
);

CREATE INDEX IF NOT EXISTS tasks_vip_tier_id_idx ON tasks (vip_tier_id);
