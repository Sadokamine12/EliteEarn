WITH vip_mini AS (
  SELECT id
  FROM vip_tiers
  WHERE slug = 'vip_mini'
  LIMIT 1
)
UPDATE tasks
SET is_active = false
WHERE vip_tier_id = (SELECT id FROM vip_mini)
  AND is_active = true;

WITH vip_mini AS (
  SELECT id
  FROM vip_tiers
  WHERE slug = 'vip_mini'
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
  vip_mini.id,
  seed.title,
  seed.description,
  seed.type,
  seed.product_name,
  NULL,
  seed.target_url,
  NULL,
  true
FROM vip_mini
CROSS JOIN (
  VALUES
    (
      'Rate the Firas Coiff app',
      'Open the App Store listing for Firas Coiff and leave a star rating based on the app-store experience.',
      'rating',
      'Firas Coiff',
      'https://apps.apple.com/ci/app/firas-coiff/id6499508872'
    ),
    (
      'Write a short review for Telegram',
      'Write a short app-store style review for Telegram with a natural user tone.',
      'review',
      'Telegram',
      NULL
    ),
    (
      'Rate the Instagram app',
      'Open the app listing for Instagram and leave a star rating based on the store experience.',
      'rating',
      'Instagram',
      NULL
    )
) AS seed(title, description, type, product_name, target_url);
