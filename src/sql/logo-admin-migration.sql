-- Admin-only website logo management — database migration.
-- Run this once on the production MySQL database (Interserver).

-- NOTE: Admin accounts are now stored in Firebase Firestore, NOT MySQL.
-- Create a document in the `admins` collection with the document ID
-- equal to the Firebase UID of the admin's Google account:
--
--   admins/{FIREBASE_UID} = {
--     email: "admin@example.com",
--     displayName: "Admin Name",
--     createdAt: <server timestamp>
--   }
--
-- The Firestore security rules (firestore.rules) forbid clients from
-- creating or editing these documents, so create them from the Firebase
-- console (or the Firebase Admin SDK).

-- Track which admin last updated the active logo.
ALTER TABLE logos
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(191) NULL AFTER updated_at;