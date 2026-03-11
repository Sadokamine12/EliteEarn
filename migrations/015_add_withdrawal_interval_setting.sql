INSERT INTO platform_settings (key, value)
VALUES ('withdrawal_interval_days', '30')
ON CONFLICT (key) DO NOTHING;
