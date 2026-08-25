# MediSpark — Project Memory & Workflow

## What this project is
MediSpark (bloodarenabd.tech) — HSC academic & medical admission preparation platform.
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind, package manager: **pnpm**.

## Language
User communicates in Bengali/Banglish — reply in the same style.

## Infrastructure (current, as of 2026-08)
- **Hosting:** Vercel — production project `medisparkbd` (account `eduall2005pass-8109s-projects`),
  connected to GitHub repo `eduall2005pass/medisparkbd`. Mirror repo: `medispark`. Legacy Vercel project `medispark`
  (repo `eduall2005pass/clinic`) still holds the old deployment.
- **Domain:** bloodarenabd.tech → Vercel DNS (ns1/ns2.vercel-dns.com)
- **MySQL:** Azure Database for MySQL Flexible Server (managed PaaS)
  - Host: `eduall2005pass.mysql.database.azure.com` port **3306**, TLS required
    (`src/lib/mysql.ts` enables SSL automatically for azure.com hosts)
  - Resource group `mysql`, SKU Standard_B1ms Burstable, HA off
  - Admin user `siam`; DB `bloodare_medispark`
  - Firewall: allow-all (0.0.0.0/0) because Vercel has no static egress IPs;
    security relies on TLS + credentials
  - GIPK note: server generates invisible `my_row_id` PKs; real keys exist as
    `uq_<table>_pk` UNIQUE indexes — keep that pattern for new tables
- **Legacy VM:** MariaDB on Azure VM `52.184.98.228:3000` is retired (data migrated
  2026-08-25). Media now runs on the separate medispark VM (20.219.193.182).
  - SSH key on this machine is broken (`Permission denied`) — needs fixing separately
- **Auth:** Firebase (Google sign-in). Admins = rows in `admins` table:
  eduall2005pass@gmail.com, siyammd553@gmail.com
- **Secrets:** all credentials live in `~/deploy.env` (never commit secrets).
  Vercel env vars are set in production (MYSQL_*, FIREBASE_*).

## Collaboration rule (IMPORTANT — do this FIRST)
Two people work on this repo independently and both commit/push, so local
codebases drift apart. **Before starting ANY work, always sync first:**

```bash
git pull medispark main
```

- If there are local uncommitted changes, stash or commit them before pulling.
- Prefer fast-forward pulls; if diverged, rebase local commits on top:
  `git pull --rebase medispark main`
- Never force-push. If a push is rejected, pull --rebase first, then push again.
- After finishing any change: commit + `git push medispark main` immediately so
  the other person gets it and Vercel auto-deploys.

## Deploy flow (IMPORTANT — two-track setup)
- **Collaborator track:** remote `clinic` (eduall2005pass/clinic) → Vercel
  project `medispark` → live at bloodarenabd.tech (still on old VM MariaDB).
  Collaborator works HERE.
- **Verify track:** remote `medisparkbd` (eduall2005pass/medisparkbd) → Vercel
  project `medisparkbd` → medisparkbd-ecru.vercel.app (Azure MySQL +
  medispark.duckdns.org media).
- A GitHub Action in clinic auto-syncs every clinic push into medisparkbd,
  which auto-deploys. Trees of both repos must stay IDENTICAL — never edit
  medisparkbd directly except through the sync (or keep both in sync manually).
- Code must stay compatible with BOTH databases (see mysql.ts SSL logic).
- Manual alternative: `vercel --prod`.
- Remote `origin` (siyammd553-gif/MediSparklatest) has no push access — ignore.

## Database rules
- ALL data lives in Azure MySQL. Never use Firestore/Supabase/local disk for data.
- **Media files** (logo, favicon, banners, course images, profile pictures,
  audio) live on the **medispark VM** (`20.219.193.182`, user `siam`, hostname
  `medispark`) at `/var/www/medispark-uploads/<dir>/` and are served over HTTPS
  by nginx at `https://medispark.duckdns.org/medifiles/...` (static, Range
  support). SSH is password-auth.
- `src/lib/storage.ts` `saveFile()` forwards bytes to the VM upload service
  (`medifiles.service`, systemd, listens on 127.0.0.1:4021 behind nginx at
  `/medifiles-upload` + `/medifiles-delete`; token-auth via `X-Medifiles-Token`
  = `MEDIA_UPLOAD_TOKEN`). Only the returned URL is stored — DB stores no blobs.
- Config env vars: `MEDIA_UPLOAD_TOKEN`, `MEDIA_FILES_BASE_URL`,
  `MEDIA_UPLOAD_URL`, `MEDIA_DELETE_URL` (all set in Vercel prod +
  `/etc/medifiles.env` on VM). Server source: `server/medifiles-server.mjs`;
  unit file `deploy/medifiles.service`; nginx site
  `/etc/nginx/sites-available/medispark` (also in repo:
  `deploy/medifiles-nginx.conf`).
- Legacy: the `uploads` table (LONGBLOB) still exists; `/api/files/[id]`
  serves old rows. Old VM `52.184.98.228` (eduspark2024.duckdns.org) is
  retired — all DB media URLs were migrated to medispark.duckdns.org
  (2026-08-25). Its SSH key no longer works.
- Schema lives in `src/sql/*.sql`. After changing schema:
  1. Add/update a migration file in `src/sql/`
  2. Apply it: `ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/<file>.sql`
- Tables: students, student_ids, courses, enrollments, admins, logos,
  homepage_courses, website_settings, banners, uploads (legacy blobs only).

## Commands
- Dev: `pnpm dev`
- Typecheck: `npx tsc --noEmit` (if stale errors from .next/types appear, `rm -rf .next` first)
- Build: `pnpm build`

## Conventions
- Admin API writes go through `requireAdmin()` (Firebase token → admins table lookup).
- Student IDs: `MS-XXXXXX` generated in `src/lib/student-id.ts`, uniqueness via `student_ids` table.
- Logo/banner/settings state flows through MySQL-backed store libs in `src/lib/*-store.ts`.

## Termux (Android phone) setup
A collaborator runs opencode from Termux. Secret files live in phone storage,
NOT in the repo. Paths on the phone:

- `/sdcard/Download/deploy.env`   → all credentials (MySQL/Firebase/Vercel/GitHub)
- `/sdcard/Download/kali_key.pem` → Azure VM SSH key
- AGENTS.md                       → comes with this repo automatically

One-time setup in Termux:
```bash
termux-setup-storage                        # grant storage access
cp /sdcard/Download/kali_key.pem ~/         # /sdcard is world-readable,
chmod 600 ~/kali_key.pem                    # SSH rejects group/world-readable keys
cp /sdcard/Download/deploy.env ~/
set -a; source ~/deploy.env; set +a         # load env vars in each session
```

Then SSH to Azure VM with: `ssh -i ~/kali_key.pem azureuser@52.184.98.228`
When applying DB migrations from Termux, pipe them over SSH the same way as above.

