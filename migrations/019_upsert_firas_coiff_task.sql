WITH vip_mini AS (
  SELECT id
  FROM vip_tiers
  WHERE slug = 'vip_mini'
  LIMIT 1
),
existing AS (
  SELECT t.id
  FROM tasks t
  JOIN vip_mini vm ON vm.id = t.vip_tier_id
  WHERE t.target_url = 'https://apps.apple.com/ci/app/firas-coiff/id6499508872'
  ORDER BY t.created_at DESC
  LIMIT 1
)
UPDATE tasks
SET title = 'Rate the Firas Coiff app',
    description = 'Open the App Store listing for Firas Coiff and leave a star rating based on the app experience.',
    type = 'rating',
    product_name = 'Firas Coiff',
    is_active = true
WHERE id = (SELECT id FROM existing);

WITH vip_mini AS (
  SELECT id
  FROM vip_tiers
  WHERE slug = 'vip_mini'
  LIMIT 1
),
existing AS (
  SELECT 1
  FROM tasks t
  JOIN vip_mini vm ON vm.id = t.vip_tier_id
  WHERE t.target_url = 'https://apps.apple.com/ci/app/firas-coiff/id6499508872'
  LIMIT 1
)
INSERT INTO tasks (
  vip_tier_id,
  title,
  description,
  type,
  product_name,
  product_image_url,
  target_url,
  reward,
  is_active
)
SELECT
  vm.id,
  'Rate the Firas Coiff app',
  'Open the App Store listing for Firas Coiff and leave a star rating based on the app experience.',
  'rating',
  'Firas Coiff',
  NULL,
  'https://apps.apple.com/ci/app/firas-coiff/id6499508872',
  NULL,
  true
FROM vip_mini vm
WHERE NOT EXISTS (SELECT 1 FROM existing);
