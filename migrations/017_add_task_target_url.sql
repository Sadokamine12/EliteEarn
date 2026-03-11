ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS target_url TEXT;

WITH vip_mini_task AS (
  SELECT t.id
  FROM tasks t
  JOIN vip_tiers vt ON vt.id = t.vip_tier_id
  WHERE vt.slug = 'vip_mini'
    AND t.is_active = true
  ORDER BY t.created_at ASC
  LIMIT 1
)
UPDATE tasks
SET
  title = 'Rate the Firas Coiff app',
  description = 'Open the App Store listing for Firas Coiff and leave a star rating based on the app-store experience.',
  type = 'rating',
  product_name = 'Firas Coiff',
  target_url = 'https://apps.apple.com/ci/app/firas-coiff/id6499508872'
WHERE id IN (SELECT id FROM vip_mini_task);
