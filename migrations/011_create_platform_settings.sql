CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value)
VALUES
  ('min_deposit', '10'),
  ('min_withdrawal', '10'),
  ('welcome_bonus', '3'),
  ('usdt_bep20_wallet', 'YOUR_WALLET_ADDRESS'),
  ('btc_wallet', 'YOUR_BTC_ADDRESS'),
  ('referral_withdrawal_required', 'true'),
  ('wheel_prizes', '[1,2,3,5,0.5,1.5,2.5,10]')
ON CONFLICT (key) DO NOTHING;
