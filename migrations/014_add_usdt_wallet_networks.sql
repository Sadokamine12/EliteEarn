INSERT INTO platform_settings (key, value)
VALUES
  ('usdt_erc20_wallet', '0xdf5d0480b3fda0d84b4c25a00d3da8bb19c2455c'),
  ('usdt_trc20_wallet', 'TT56vYoPDquMecHMjmnAGeDLLaeJUgFpsg')
ON CONFLICT (key) DO NOTHING;

UPDATE platform_settings
SET value = '0xdf5d0480b3fda0d84b4c25a00d3da8bb19c2455c', updated_at = NOW()
WHERE key = 'usdt_bep20_wallet';
