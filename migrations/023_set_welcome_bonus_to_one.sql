INSERT INTO platform_settings (key, value)
VALUES ('welcome_bonus', '1')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();
