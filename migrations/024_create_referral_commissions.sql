CREATE TABLE referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  vip_tier_id UUID NOT NULL REFERENCES vip_tiers(id),
  level INT NOT NULL CHECK (level BETWEEN 1 AND 3),
  rate_percent NUMERIC(5,2) NOT NULL,
  source_amount NUMERIC(18,2) NOT NULL,
  commission_amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subscription_id, beneficiary_user_id, level)
);

INSERT INTO platform_settings (key, value)
VALUES
  ('referral_level_1_percent', '10'),
  ('referral_level_2_percent', '5'),
  ('referral_level_3_percent', '2')
ON CONFLICT (key) DO NOTHING;
