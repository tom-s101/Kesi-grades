-- =====================================================================
-- Shared classes.
--
-- A class normally belongs to one teacher per subject
-- (class_subject_teachers, which allows exactly one). Some classes have
-- no teacher of their own and are covered by several — Grade 5 at
-- Baraas, for one. This lets any number of extra teachers share a
-- class: each sees its students, takes attendance, and enters grades
-- for every subject, exactly as its own teacher would.
--
-- It sits beside class_subject_teachers rather than loosening its
-- one-teacher rule, because the School Admin page relies on that rule
-- when it reassigns a class.
--
-- Safe to re-run.
-- =====================================================================

create table if not exists class_section_shared_teachers (
  section_id  uuid not null references class_sections(id) on delete cascade,
  teacher_id  uuid not null references teachers(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (section_id, teacher_id)
);

create index if not exists cs_shared_teacher_idx on class_section_shared_teachers(teacher_id);

alter table class_section_shared_teachers enable row level security;

drop policy if exists cs_shared_read on class_section_shared_teachers;
create policy cs_shared_read on class_section_shared_teachers for select using (auth.uid() is not null);

drop policy if exists cs_shared_write on class_section_shared_teachers;
create policy cs_shared_write on class_section_shared_teachers for all
  using (
    auth_is_master_admin()
    or exists (select 1 from class_sections cs where cs.id = section_id and auth_is_head_teacher_of(cs.school_id))
  )
  with check (
    auth_is_master_admin()
    or exists (select 1 from class_sections cs where cs.id = section_id and auth_is_head_teacher_of(cs.school_id))
  );

-- ---------------------------------------------------------------------
-- The two checks every student, attendance and grade policy goes
-- through (see 0009) now count a shared class as the teacher's own.
-- ---------------------------------------------------------------------

create or replace function auth_teaches_section(target_section uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_subject_teachers
    where teacher_id = auth.uid() and section_id = target_section
  ) or exists (
    select 1 from class_section_shared_teachers
    where teacher_id = auth.uid() and section_id = target_section
  );
$$;

create or replace function auth_can_grade_section(target_section uuid, target_subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    auth_is_master_admin()
    or exists (
      select 1 from class_sections cs
      where cs.id = target_section and auth_is_head_teacher_of(cs.school_id)
    )
    or exists (
      select 1 from class_subject_teachers
      where teacher_id = auth.uid() and section_id = target_section and subject_id = target_subject
    )
    -- Sharing a class covers every subject in it.
    or exists (
      select 1 from class_section_shared_teachers
      where teacher_id = auth.uid() and section_id = target_section
    );
$$;

-- The older grade-wide check, still used by the enrolment-history policy.
create or replace function auth_teaches_grade(target_school uuid, target_grade uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_subject_teachers
    where teacher_id = auth.uid() and school_id = target_school and grade_level_id = target_grade
  ) or exists (
    select 1 from class_section_shared_teachers sh
    join class_sections cs on cs.id = sh.section_id
    where sh.teacher_id = auth.uid() and cs.school_id = target_school and cs.grade_level_id = target_grade
  );
$$;
