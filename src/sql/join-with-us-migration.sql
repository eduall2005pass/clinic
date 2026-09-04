-- Join With Us Now !! — homepage section after FAQ, before Footer.
-- Social platforms: Facebook, YouTube, Telegram (premium cards, DB-driven via social_links).

-- Ensure homepage_sections has join-with-us (immediately after faq, sort_order 11)
INSERT IGNORE INTO homepage_sections (section_key, sort_order, is_active) VALUES
  ('join-with-us', 11, 1);

-- Ensure FAQ has correct title for heading consistency (optional, not forced)
-- Keep existing homepage_sectionsTitles, just ensure join-with-us exists

-- Ensure social_links has the 3 required platforms for Join With Us (facebook, youtube, telegram)
-- Existing social_links-migration only had 2; ensure telegram and keep instagram/linkedin optional
INSERT INTO social_links (platform_key, sort_order, is_active) VALUES
  ('telegram', 3, 1),
  ('instagram', 4, 1),
  ('linkedin', 5, 1)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- Ensure join platforms are enabled by default (admin can disable)
UPDATE social_links SET is_active = 1 WHERE platform_key IN ('facebook','youtube','telegram');

-- Optional: ensure sort_order is correct for Join order (facebook 1, youtube 2, telegram 3)
UPDATE social_links SET sort_order = 1 WHERE platform_key = 'facebook';
UPDATE social_links SET sort_order = 2 WHERE platform_key = 'youtube';
UPDATE social_links SET sort_order = 3 WHERE platform_key = 'telegram';
