-- Payment Card: admin-controlled Coupon Availability (ON/OFF) toggle.
-- OFF hides the coupon option from students — coupon data is NOT deleted.
ALTER TABLE payment_card
  ADD COLUMN coupon_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER nagad_enabled;
