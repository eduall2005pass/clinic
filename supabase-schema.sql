-- ============================================================
-- MediSpark — Supabase schema (run in Supabase SQL Editor)
-- Database layer for the Next.js app. Firebase Auth (Google
-- sign-in) stays the identity provider; this schema stores all
-- app data. All access goes through the service role key in
-- server-side API routes, so RLS is enabled with no policies.
-- ============================================================

-- Student profiles (one row per Firebase user)
create table if not exists public.students (
  uid text primary key,
  student_id text not null unique,
  full_name text not null,
  gender text not null default '',
  institution text not null default '',
  hsc_batch text not null default '',
  contact_number text not null default '',
  email text not null default '',
  facebook_url text not null default '',
  profile_picture_url text not null default '',
  provider text not null default 'google',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Student ID registry (guarantees unique IDs)
create table if not exists public.student_ids (
  student_id text primary key,
  uid text not null,
  created_at timestamptz not null default now()
);

-- Course catalog registry (kept in sync with src/lib/courses.ts)
create table if not exists public.courses (
  course_id text primary key,
  kind text not null check (kind in ('free', 'paid')),
  created_at timestamptz not null default now()
);

-- Enrollment records (one row per student per course)
create table if not exists public.enrollments (
  student_uid text not null,
  course_id text not null,
  course_name text not null,
  course_type text not null check (course_type in ('Academic', 'Admission')),
  course_kind text not null check (course_kind in ('free', 'paid')),
  fee numeric not null default 0,
  enrollment_status text not null
    check (enrollment_status in ('pending', 'active', 'cancelled', 'completed')),
  enrollment_date timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_uid, course_id)
);

create index if not exists enrollments_student_uid_idx
  on public.enrollments (student_uid);

-- Active website logo metadata (image lives in the website-logos bucket)
create table if not exists public.logos (
  id text primary key,
  url text not null,
  file_name text not null,
  width int not null default 0,
  height int not null default 0,
  storage_path text not null default '',
  updated_at timestamptz not null default now()
);

-- Hero banner slider metadata (images live in the website-banners bucket)
create table if not exists public.banners (
  id text primary key,
  slides jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Enable RLS everywhere; no policies are defined, so the anon key
-- cannot read or write anything. Only the service role (used in
-- server-side API routes) can access these tables.
alter table public.students enable row level security;
alter table public.student_ids enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.logos enable row level security;
alter table public.banners enable row level security;