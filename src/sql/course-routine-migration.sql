-- Course Routine — per-course routine files (PDF / images)
-- Attached to each course in catalog_courses. Supports:
--   - Single PDF
--   - Single image
--   - Multi-page images / multi-file documents
-- Stored as JSON array of URLs (e.g. ["https://.../routines/file1.pdf", "https://.../page2.jpg"])
-- Viewer on course details page detects type by extension and renders accordingly.

ALTER TABLE catalog_courses
  ADD COLUMN IF NOT EXISTS routine_urls JSON NULL;
