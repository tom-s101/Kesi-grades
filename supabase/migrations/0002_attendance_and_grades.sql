-- =====================================================================
-- Migration 2 of 4: attendance and grade records
-- =====================================================================

-- ---------------------------------------------------------------------
-- Attendance
-- Each school day has an 'am' record and, Monday-Thursday, a 'pm'
-- record. Fridays are morning-only, enforced by the trigger below.
-- ---------------------------------------------------------------------

create table attendance_records (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  school_year_id   uuid not null references school_years(id) on delete cascade,
  attendance_date  date not null,
  session          text not null check (session in ('am','pm')),
  status           text not null check (status in ('present','late','absent')),
  recorded_by      uuid references teachers(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id, attendance_date, session)
);

create index attendance_student_idx on attendance_records(student_id, attendance_date);
create index attendance_date_idx on attendance_records(attendance_date);

create or replace function reject_friday_pm_attendance()
returns trigger language plpgsql as $$
begin
  if new.session = 'pm' and extract(dow from new.attendance_date) = 5 then
    raise exception 'Friday has no afternoon session (student %, date %)', new.student_id, new.attendance_date;
  end if;
  -- No school on weekends.
  if extract(dow from new.attendance_date) in (0, 6) then
    raise exception 'Attendance date % falls on a weekend', new.attendance_date;
  end if;
  return new;
end;
$$;

create trigger attendance_friday_pm_guard
  before insert or update on attendance_records
  for each row execute function reject_friday_pm_attendance();

create trigger attendance_set_updated_at
  before update on attendance_records
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Grades
-- Teachers may enter either a raw score (raw_score / max_score) or a
-- direct percentage. percentage is always populated (computed from the
-- raw score when one is given) so downstream math never has to branch.
-- ---------------------------------------------------------------------

create table weekly_scores (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references students(id) on delete cascade,
  school_year_id     uuid not null references school_years(id) on delete cascade,
  quarter_id         uuid not null references quarters(id) on delete cascade,
  subject_id         uuid not null references subjects(id) on delete cascade,
  assessment_type    text not null check (assessment_type in ('quiz','homework_participation')),
  week_number        smallint not null check (week_number between 1 and 12),
  raw_score          numeric(6,2),
  max_score          numeric(6,2),
  percentage         numeric(5,2) not null check (percentage between 0 and 100),
  recorded_by        uuid references teachers(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (student_id, quarter_id, subject_id, assessment_type, week_number),
  check (raw_score is null or (max_score is not null and max_score > 0 and raw_score >= 0 and raw_score <= max_score))
);

create index weekly_scores_lookup_idx on weekly_scores(student_id, quarter_id, subject_id);
create index weekly_scores_quarter_idx on weekly_scores(quarter_id, subject_id);

create trigger weekly_scores_set_updated_at
  before update on weekly_scores
  for each row execute function set_updated_at();

create table quarter_exam_scores (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references students(id) on delete cascade,
  school_year_id     uuid not null references school_years(id) on delete cascade,
  quarter_id         uuid not null references quarters(id) on delete cascade,
  subject_id         uuid not null references subjects(id) on delete cascade,
  raw_score          numeric(6,2),
  max_score          numeric(6,2),
  percentage         numeric(5,2) not null check (percentage between 0 and 100),
  recorded_by        uuid references teachers(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (student_id, quarter_id, subject_id),
  check (raw_score is null or (max_score is not null and max_score > 0 and raw_score >= 0 and raw_score <= max_score))
);

create index exam_scores_lookup_idx on quarter_exam_scores(student_id, quarter_id, subject_id);

create trigger exam_scores_set_updated_at
  before update on quarter_exam_scores
  for each row execute function set_updated_at();
