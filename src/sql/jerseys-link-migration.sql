-- Jerseys: optional order/checkout link shown on the home page.
ALTER TABLE jerseys ADD COLUMN IF NOT EXISTS link VARCHAR(1024) NULL AFTER image_url;
