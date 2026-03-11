ALTER TABLE withdrawals
ADD COLUMN IF NOT EXISTS fee_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(18,2);

INSERT INTO platform_settings (key, value)
VALUES ('withdrawal_fee_percent', '20')
ON CONFLICT (key) DO NOTHING;

UPDATE withdrawals
SET
  fee_percent = COALESCE(fee_percent, 20),
  fee_amount = ROUND(amount * (COALESCE(NULLIF(fee_percent, 0), 20) / 100.0), 2),
  net_amount = ROUND(amount - ROUND(amount * (COALESCE(NULLIF(fee_percent, 0), 20) / 100.0), 2), 2)
WHERE net_amount IS NULL;
