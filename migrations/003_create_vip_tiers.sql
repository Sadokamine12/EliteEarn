CREATE TABLE IF NOT EXISTS vip_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  price NUMERIC(18,2) NOT NULL,
  daily_earnings NUMERIC(18,2) NOT NULL,
  daily_tasks_count INT NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO vip_tiers (name, slug, price, daily_earnings, daily_tasks_count, sort_order)
VALUES
  ('VIP Mini', 'vip_mini', 10, 0.50, 3, 1),
  ('VIP Starter', 'vip_starter', 20, 1.20, 6, 2),
  ('VIP 0', 'vip_0', 60, 3.00, 8, 3),
  ('VIP Plus', 'vip_plus', 150, 7.50, 10, 4),
  ('VIP 1', 'vip_1', 360, 18.00, 15, 5),
  ('VIP 2', 'vip_2', 1300, 65.00, 20, 6),
  ('VIP 3', 'vip_3', 450, 22.50, 18, 7),
  ('VIP 4', 'vip_4', 1800, 90.00, 25, 8)
ON CONFLICT (slug) DO NOTHING;
