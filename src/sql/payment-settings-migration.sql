-- Step 3: Paid Course enrollment — admin-managed payment card + student payment info.
ALTER TABLE enrollment_settings ADD COLUMN IF NOT EXISTS bkash_number VARCHAR(40) NULL;
ALTER TABLE enrollment_settings ADD COLUMN IF NOT EXISTS nagad_number VARCHAR(40) NULL;
ALTER TABLE enrollment_settings ADD COLUMN IF NOT EXISTS payment_instructions TEXT NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(100) NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_sender VARCHAR(30) NULL;
