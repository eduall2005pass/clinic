# MediSpark — Project Memory & Workflow

## What this project is
MediSpark (bloodarenabd.tech) — HSC academic & medical admission preparation platform.
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind, package manager: **pnpm**.

## Language
User communicates in Bengali/Banglish — reply in the same style.

## Infrastructure (current, as of 2026-08)
- **Hosting:** Vercel (project `medispark`, account `eduall2005pass-8109s-projects`)
- **Domain:** bloodarenabd.tech → Vercel DNS (ns1/ns2.vercel-dns.com)
- **MySQL:** MariaDB on Azure VM `52.184.98.228` port **3000** (3306 is blocked by NSG; no NSG access)
  - SSH: `ssh -i ~/Desktop/kali_key.pem azureuser@52.184.98.228`
  - DB: `bloodare_medispark`, user `medispark`
  - Always-on: systemd `mariadb` enabled
- **Auth:** Firebase (Google sign-in). Admins = rows in `admins` table:
  eduall2005pass@gmail.com, siyammd553@gmail.com
- **Secrets:** all credentials live in `~/deploy.env` (never commit secrets).
  Vercel env vars are set in production (MYSQL_*, FIREBASE_*).

## Deploy flow (IMPORTANT)
- Git remote `clinic` = https://github.com/eduall2005pass/clinic → connected to Vercel.
- **`git push clinic main` triggers automatic production deploy.**
- Manual alternative: `vercel --prod`.
- Remote `origin` (siyammd553-gif/MediSparklatest) has no push access — ignore it.

## Database rules
- ALL data lives in Azure MySQL. Never use Firestore/Supabase/local disk for data.
- **Never write files to disk** (Vercel filesystem is ephemeral). All uploads
  (logo, favicon, banners, course images, profile pictures) go to the `uploads`
  table (LONGBLOB) via `src/lib/storage.ts` and are served by `/api/files/[id]`.
- Schema lives in `src/sql/*.sql`. After changing schema:
  1. Add/update a migration file in `src/sql/`
  2. Apply it: `ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/<file>.sql`
- Tables: students, student_ids, courses, enrollments, admins, logos,
  homepage_courses, website_settings, banners, uploads.

## Commands
- Dev: `pnpm dev`
- Typecheck: `npx tsc --noEmit` (if stale errors from .next/types appear, `rm -rf .next` first)
- Build: `pnpm build`

## Conventions
- Admin API writes go through `requireAdmin()` (Firebase token → admins table lookup).
- Student IDs: `MS-XXXXXX` generated in `src/lib/student-id.ts`, uniqueness via `student_ids` table.
- Logo/banner/settings state flows through MySQL-backed store libs in `src/lib/*-store.ts`.
