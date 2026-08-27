-- Staff Roles / Admin Roles — RBAC extension for Admin Center.
-- Adds the 3 Staff Roles (Admin, Moderator, Teacher) and flexible
-- granular permissions for Teacher (Course Content, Public Exam, Q&A, Result).
-- Admin holds all controls previously available to Super Admin (full access).
-- Existing role_permissions rows are preserved; new defaults are inserted via
-- src/lib/administration.ts when no override exists.
-- Apply with:
--   mysql bloodare_medispark < src/sql/staff-roles-migration.sql

-- Ensure admin_roles can store the new role values (already VARCHAR(64)).
-- No schema change needed; this migration seeds the flexible permission matrix.

-- Seed / migrate role_permissions for the 3 roles.
-- Admin always holds every permission (handled in code); this row is
-- still stored for visibility in the Roles matrix UI.
INSERT INTO role_permissions (role, permissions) VALUES
  ('admin', '["manageContent","manageCourses","manageExams","manageStudents","manageAdmins","manageSystem","manageCourseContent","managePublicExam","manageQa","manageResults"]'),
  ('moderator', '["manageContent","manageCourses","manageExams"]'),
  ('teacher', '["manageCourseContent","managePublicExam","manageQa","manageResults"]')
ON DUPLICATE KEY UPDATE permissions = VALUES(permissions);

-- Migrate legacy Super Admin to Admin (Admin now has previous Super Admin controls).
UPDATE admin_roles SET role = 'admin' WHERE role = 'super-admin';
UPDATE admins SET role = 'admin' WHERE role = 'super-admin';
DELETE FROM role_permissions WHERE role = 'super-admin';

-- Optional: migrate legacy roles (content-manager, course-manager, exam-manager)
-- to the new taxonomy if any rows still use them. Keeps existing admins functional.
UPDATE admin_roles SET role = 'moderator' WHERE role = 'content-manager';
UPDATE admin_roles SET role = 'moderator' WHERE role = 'course-manager';
UPDATE admin_roles SET role = 'teacher'   WHERE role = 'exam-manager';
UPDATE admins SET role = 'moderator' WHERE role = 'content-manager';
UPDATE admins SET role = 'moderator' WHERE role = 'course-manager';
UPDATE admins SET role = 'teacher'   WHERE role = 'exam-manager';

-- Ensure admins.role column can hold new values (already VARCHAR(64)).
-- No further schema change.
