INSERT INTO platform_settings (key, value)
VALUES ('withdrawal_processing_hours', '72')
ON CONFLICT (key) DO NOTHING;
