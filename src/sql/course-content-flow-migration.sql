-- Course Content Flow Migration
-- Migrates content_layout ENUM from old values (auto/direct/paper/subject)
-- to new flow values (flow-1/flow-2/flow-3).
--
-- Flow 1 (Direct):  Course → Class / Exam / Materials / Archive → Chapter → Content
-- Flow 2 (Paper):   Course → 1st Paper / 2nd Paper → Class / Exam / Materials / Archive → Chapter → Content
-- Flow 3 (Subject): Course → Subject → Class / Exam / Materials / Archive → Chapter → Content
--
-- Apply: ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/course-content-flow-migration.sql

-- Step 1: Widen the ENUM to accept both old and new values.
ALTER TABLE catalog_courses
  MODIFY COLUMN content_layout ENUM('auto','direct','paper','subject','flow-1','flow-2','flow-3')
  NOT NULL DEFAULT 'auto';

-- Step 2: Migrate legacy values to the new flow system.
UPDATE catalog_courses SET content_layout = 'flow-1' WHERE content_layout IN ('auto', 'direct');
UPDATE catalog_courses SET content_layout = 'flow-2' WHERE content_layout = 'paper';
UPDATE catalog_courses SET content_layout = 'flow-3' WHERE content_layout = 'subject';

-- Step 3: Narrow the ENUM to only flow values.
ALTER TABLE catalog_courses
  MODIFY COLUMN content_layout ENUM('flow-1','flow-2','flow-3')
  NOT NULL DEFAULT 'flow-1';
