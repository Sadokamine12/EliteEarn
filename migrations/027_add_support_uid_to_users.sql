ALTER TABLE users
ADD COLUMN IF NOT EXISTS support_uid VARCHAR(6);

CREATE OR REPLACE FUNCTION generate_support_uid_value()
RETURNS VARCHAR(6) AS $$
DECLARE
  candidate VARCHAR(6);
BEGIN
  LOOP
    candidate := LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM users
      WHERE support_uid = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

UPDATE users
SET support_uid = generate_support_uid_value()
WHERE support_uid IS NULL;

ALTER TABLE users
ALTER COLUMN support_uid SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_support_uid_key'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_support_uid_key UNIQUE (support_uid);
  END IF;
END;
$$;

DROP FUNCTION generate_support_uid_value();
