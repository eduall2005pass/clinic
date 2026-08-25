-- FAQ answer types: text / video / text+video, plus enable-disable flag.
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS answer_type ENUM('text','video','text_video') NOT NULL DEFAULT 'text' AFTER question;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS video_url VARCHAR(1024) NULL AFTER answer;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status;
