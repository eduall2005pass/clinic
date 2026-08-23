-- Firebase Cloud Messaging (FCM) web push registration tokens.
CREATE TABLE IF NOT EXISTS push_tokens (
  token VARCHAR(512) NOT NULL PRIMARY KEY,
  uid VARCHAR(191) NOT NULL,
  email VARCHAR(191) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY push_tokens_uid_idx (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
