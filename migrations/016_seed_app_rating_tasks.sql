UPDATE tasks
SET is_active = false
WHERE is_active = true;

WITH app_catalog AS (
  SELECT *
  FROM (
    VALUES
      (1, 'WhatsApp'),
      (2, 'Telegram'),
      (3, 'Instagram'),
      (4, 'TikTok'),
      (5, 'Spotify'),
      (6, 'YouTube'),
      (7, 'Snapchat'),
      (8, 'Netflix'),
      (9, 'Duolingo'),
      (10, 'Uber'),
      (11, 'Google Maps'),
      (12, 'Discord'),
      (13, 'Pinterest'),
      (14, 'Airbnb'),
      (15, 'CapCut'),
      (16, 'Shazam'),
      (17, 'Notion'),
      (18, 'Canva'),
      (19, 'LinkedIn'),
      (20, 'Amazon Shopping'),
      (21, 'X'),
      (22, 'Microsoft Outlook'),
      (23, 'Google Drive'),
      (24, 'PayPal'),
      (25, 'Booking.com')
  ) AS catalog(ord, app_name)
)
INSERT INTO tasks (
  vip_tier_id,
  title,
  description,
  type,
  product_name,
  product_image_url,
  reward,
  is_active
)
SELECT
  vt.id,
  CASE
    WHEN gs.task_index % 2 = 1 THEN 'Rate the ' || ac.app_name || ' app'
    ELSE 'Write a short review for ' || ac.app_name
  END AS title,
  CASE
    WHEN gs.task_index % 2 = 1 THEN
      'Open the app listing for ' || ac.app_name || ' and leave a star rating based on the store experience.'
    ELSE
      'Write a short app-store style review for ' || ac.app_name || ' with a natural user tone.'
  END AS description,
  CASE
    WHEN gs.task_index % 2 = 1 THEN 'rating'
    ELSE 'review'
  END AS type,
  ac.app_name,
  NULL,
  NULL,
  true
FROM vip_tiers vt
JOIN LATERAL generate_series(1, vt.daily_tasks_count) AS gs(task_index) ON true
JOIN app_catalog ac ON ac.ord = gs.task_index
WHERE vt.is_active = true;
