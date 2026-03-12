ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_team_bonus_claimed BOOLEAN NOT NULL DEFAULT false;

INSERT INTO platform_settings (key, value)
VALUES
  ('referral_team_bonus_target', '5'),
  ('referral_team_bonus_amount', '500')
ON CONFLICT (key) DO NOTHING;
