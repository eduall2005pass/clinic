-- Step 6: Enrollment applications — approval / rejection audit columns.
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS approved_by VARCHAR(191) NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(191) NULL;
