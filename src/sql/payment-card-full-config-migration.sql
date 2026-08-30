-- Payment Card full config migration
-- Adds per-element enable/disable toggles + editable labels/placeholders
-- so Admin can control every piece of information on the student payment card.

ALTER TABLE payment_card
  ADD COLUMN fee_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER note,
  ADD COLUMN fee_label VARCHAR(40) NOT NULL DEFAULT 'Course Fee' AFTER fee_enabled,
  ADD COLUMN discount_label VARCHAR(40) NOT NULL DEFAULT 'Discount' AFTER fee_label,
  ADD COLUMN coupon_placeholder VARCHAR(40) NOT NULL DEFAULT 'COUPON CODE' AFTER discount_label,
  ADD COLUMN apply_label VARCHAR(40) NOT NULL DEFAULT 'Apply' AFTER coupon_placeholder,
  ADD COLUMN payable_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER apply_label,
  ADD COLUMN payable_label VARCHAR(40) NOT NULL DEFAULT 'Payable Amount' AFTER payable_enabled,
  ADD COLUMN methods_label VARCHAR(40) NOT NULL DEFAULT 'Payment Methods' AFTER payable_label,
  ADD COLUMN bkash_label VARCHAR(40) NOT NULL DEFAULT 'bKash' AFTER methods_label,
  ADD COLUMN nagad_label VARCHAR(40) NOT NULL DEFAULT 'Nagad' AFTER bkash_label,
  ADD COLUMN instructions_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER nagad_label,
  ADD COLUMN tx_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER instructions_enabled,
  ADD COLUMN tx_label VARCHAR(40) NOT NULL DEFAULT 'Transaction ID' AFTER tx_enabled,
  ADD COLUMN tx_placeholder VARCHAR(80) NOT NULL DEFAULT 'e.g. 8N7DQK2XLM' AFTER tx_label,
  ADD COLUMN sender_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER tx_placeholder,
  ADD COLUMN sender_label VARCHAR(40) NOT NULL DEFAULT 'Payment From Number' AFTER sender_enabled,
  ADD COLUMN sender_placeholder VARCHAR(40) NOT NULL DEFAULT '01XXXXXXXXX' AFTER sender_label,
  ADD COLUMN pending_note_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER sender_placeholder,
  ADD COLUMN pending_note VARCHAR(500) NOT NULL DEFAULT 'Submit payment details — enrollment stays Pending Validation until admin verifies payment.' AFTER pending_note_enabled,
  ADD COLUMN cancel_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER pending_note,
  ADD COLUMN cancel_label VARCHAR(40) NOT NULL DEFAULT 'Cancel' AFTER cancel_enabled,
  ADD COLUMN submit_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER cancel_label,
  ADD COLUMN submit_label VARCHAR(40) NOT NULL DEFAULT 'Submit Payment' AFTER submit_enabled,
  ADD COLUMN submitting_label VARCHAR(40) NOT NULL DEFAULT 'Submitting Payment...' AFTER submit_label;
