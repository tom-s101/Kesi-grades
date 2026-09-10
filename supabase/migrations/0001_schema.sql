-- =====================================================================
-- KESI (Katutubo Excel Schools) — core schema
-- Migration 1 of 4: extensions, reference tables, people, classes,
-- students. Run in order 0001 -> 0004 in the Supabase SQL editor,
-- or via `supabase db push` if you use the CLI.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------

create table schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  slug         text not null unique,
  created_at   timestamptz not null default now()
);

create table grade_levels (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,        -- 'KA','KB','G1'..'G5'
  name         text not null,                -- 'Kindergarten A', 'Grade 1'
  sort_order   int not null unique
);

create table subjects (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  sort_order   int not null unique
);

create table school_years (
  id           uuid primary key default gen_random_uuid(),
  label        text not null unique,         -- '2026-2027'
  start_date   date not null,
  end_date     date not null,
  is_current   boolean not null default false
);

-- Only one school year may be marked current at a time.
create unique index one_current_school_year on school_years (is_current) where is_current;

create table quarters (
  id               uuid primary key default gen_random_uuid(),
  school_year_id   uuid not null references school_years(id) on delete cascade,
  number           smallint not null check (number between 1 and 4),
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  exam_week_start  date not null,
  exam_week_end    date not null,
  unique (school_year_id, number)
);

-- A school may "turn off" a grade level for a given year (no students
-- enrolled / not offered), so head teachers can hide it instead of it
-- showing up empty everywhere.
create table school_grade_levels (
  school_id        uuid not null references schools(id) on delete cascade,
  grade_level_id   uuid not null references grade_levels(id) on delete cascade,
  school_year_id   uuid not null references school_years(id) on delete cascade,
  is_active        boolean not null default true,
  primary key (school_id, grade_level_id, school_year_id)
);

-- Grading weights are configurable per school year rather than hardcoded,
-- in case the weighting policy changes. Seeded with the 85/12/3 split.
create table grade_weight_configs (
  id                 uuid primary key default gen_random_uuid(),
  school_year_id     uuid not null references school_years(id) on delete cascade,
  exam_weight        numeric(4,3) not null default 0.850,
  quiz_weight        numeric(4,3) not null default 0.120,
  homework_weight    numeric(4,3) not null default 0.030,
  unique (school_year_id),
  check (exam_weight + quiz_weight + homework_weight = 1)
);

-- ---------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------

-- One row per authenticated user. id matches auth.users.id (created via
-- the seed script using the Supabase Admin API — see supabase/seed).
create table teachers (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null,
  school_id          uuid references schools(id) on delete set null,
  is_head_teacher    boolean not null default false,
  is_master_admin    boolean not null default false,
  whatsapp_number    text unique,             -- E.164, e.g. +639171234567
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

create index teachers_school_idx on teachers(school_id);

-- A teacher is assigned to teach one subject to one grade level at one
-- school for a given school year. Homeroom teachers get one row per
-- subject they cover; a specialist (e.g. PE) gets one row per grade
-- level they teach. Reassigning or merging classes is just updating
-- teacher_id here, which is why it's its own table rather than a column
-- on students.
create table class_subject_teachers (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references schools(id) on delete cascade,
  grade_level_id   uuid not null references grade_levels(id) on delete cascade,
  subject_id       uuid not null references subjects(id) on delete cascade,
  school_year_id   uuid not null references school_years(id) on delete cascade,
  teacher_id       uuid not null references teachers(id) on delete restrict,
  created_at       timestamptz not null default now(),
  unique (school_id, grade_level_id, subject_id, school_year_id)
);

create index cst_teacher_idx on class_subject_teachers(teacher_id);

-- ---------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------

create table students (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid not null references schools(id) on delete restrict,
  lrn                   text,                 -- DepEd Learner Reference Number, optional
  first_name            text not null,
  middle_name           text,
  last_name             text not null,
  suffix                text,
  sex                   text check (sex in ('M','F')),
  birthdate             date,
  guardian_name          text,
  guardian_contact       text,
  current_grade_level_id uuid references grade_levels(id),
  status                text not null default 'active'
                          check (status in ('active','dropped','transferred','completed')),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index students_school_idx on students(school_id);
create index students_grade_idx on students(current_grade_level_id);

-- Per-year placement, kept so grade-level history survives promotion to
-- the next school year and a student's records from prior years stay
-- attached to the grade/school they were actually in.
create table student_enrollments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  school_id        uuid not null references schools(id) on delete cascade,
  grade_level_id   uuid not null references grade_levels(id) on delete cascade,
  school_year_id   uuid not null references school_years(id) on delete cascade,
  status           text not null default 'active'
                     check (status in ('active','dropped','transferred','completed')),
  unique (student_id, school_year_id)
);

create index enrollments_student_idx on student_enrollments(student_id);
create index enrollments_lookup_idx on student_enrollments(school_id, grade_level_id, school_year_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger students_set_updated_at
  before update on students
  for each row execute function set_updated_at();
