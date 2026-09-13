-- =====================================================================
-- Class sections — lets a grade be split into more than one class,
-- each with its own teacher (e.g. two Kindergarten A classes at
-- Baraas). Before this, class_subject_teachers allowed only one
-- teacher per (school, grade, subject), and a regular teacher's RLS
-- access was scoped to the whole grade — so two teachers sharing a
-- grade would each see and could edit the other's students. Sections
-- fix both: every grade always has at least one section ("Main"), and
-- a regular teacher's access is now scoped to their section(s), not
-- the whole grade.
-- =====================================================================

create table class_sections (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references schools(id) on delete cascade,
  grade_level_id   uuid not null references grade_levels(id) on delete cascade,
  school_year_id   uuid not null references school_years(id) on delete cascade,
  name             text not null,
  sort_order       int not null default 1,
  created_at       timestamptz not null default now(),
  unique (school_id, grade_level_id, school_year_id, name)
);

-- One "Main" section per grade a school currently offers, so there's
-- always somewhere to put students/assignments even before anyone
-- splits a grade into two classes.
insert into class_sections (school_id, grade_level_id, school_year_id, name, sort_order)
select sgl.school_id, sgl.grade_level_id, sgl.school_year_id, 'Main', 1
from school_grade_levels sgl
where sgl.is_active
on conflict (school_id, grade_level_id, school_year_id, name) do nothing;

-- ---------------------------------------------------------------------
-- students.section_id
-- ---------------------------------------------------------------------

alter table students add column section_id uuid references class_sections(id) on delete set null;

update students s
set section_id = cs.id
from class_sections cs
where s.section_id is null
  and s.current_grade_level_id = cs.grade_level_id
  and s.school_id = cs.school_id
  and cs.name = 'Main'
  and cs.school_year_id = (select id from school_years where is_current);

create index students_section_idx on students(section_id);

-- ---------------------------------------------------------------------
-- class_subject_teachers.section_id — replaces the old one-teacher-
-- per-grade unique constraint with one-teacher-per-section.
-- ---------------------------------------------------------------------

alter table class_subject_teachers add column section_id uuid references class_sections(id) on delete cascade;

update class_subject_teachers cst
set section_id = cs.id
from class_sections cs
where cst.section_id is null
  and cst.grade_level_id = cs.grade_level_id
  and cst.school_id = cs.school_id
  and cst.school_year_id = cs.school_year_id
  and cs.name = 'Main';

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'class_subject_teachers'::regclass and contype = 'u'
  loop
    execute format('alter table class_subject_teachers drop constraint %I', c.conname);
  end loop;
end $$;

alter table class_subject_teachers
  alter column section_id set not null,
  add constraint cst_unique_section unique (school_id, grade_level_id, subject_id, school_year_id, section_id);

create index cst_section_idx on class_subject_teachers(section_id);

-- ---------------------------------------------------------------------
-- RLS on class_sections itself
-- ---------------------------------------------------------------------

alter table class_sections enable row level security;

create policy sections_read on class_sections for select using (auth.uid() is not null);

create policy sections_write on class_sections for all
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id))
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

-- ---------------------------------------------------------------------
-- Section-aware permission functions
-- ---------------------------------------------------------------------

create or replace function auth_teaches_section(target_section uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_subject_teachers
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
    );
$$;

-- Student access is now scoped to their section, not their whole grade.
create or replace function auth_can_access_student(target_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth_is_master_admin() then true
    else exists (
      select 1 from students st
      where st.id = target_student
        and (
          auth_is_head_teacher_of(st.school_id)
          or (st.section_id is not null and auth_teaches_section(st.section_id))
        )
    )
  end;
$$;

-- ---------------------------------------------------------------------
-- 0008's sensitive-column guard checked school_id/current_grade_level_id
-- /status but not section_id — a gap this closes, since section_id
-- didn't exist yet when that trigger was written. Without this, any
-- teacher who can update a student at all could move them into a
-- different class/teacher's section without head-teacher sign-off.
-- ---------------------------------------------------------------------

create or replace function guard_student_sensitive_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth_is_master_admin() or auth_is_head_teacher_of(old.school_id) then
    return new;
  end if;

  if new.school_id is distinct from old.school_id
     or new.current_grade_level_id is distinct from old.current_grade_level_id
     or new.section_id is distinct from old.section_id
     or new.status is distinct from old.status then
    raise exception 'Only a head teacher or master admin can change a student''s grade, section, school, or status';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Re-scope students_read / students_update to sections. (students_read
-- was defined in 0004_rls.sql; students_update in 0008 — replaced here
-- rather than there so the section rework lives in one place.)
-- ---------------------------------------------------------------------

drop policy if exists students_read on students;
create policy students_read on students for select
  using (
    auth_is_master_admin()
    or auth_is_head_teacher_of(school_id)
    or (section_id is not null and auth_teaches_section(section_id))
  );

drop policy if exists students_update on students;
create policy students_update on students for update
  using (
    auth_is_master_admin()
    or auth_is_head_teacher_of(school_id)
    or (section_id is not null and auth_teaches_section(section_id))
  )
  with check (
    auth_is_master_admin()
    or auth_is_head_teacher_of(school_id)
    or (section_id is not null and auth_teaches_section(section_id))
  );

-- ---------------------------------------------------------------------
-- Grades must be entered by the teacher assigned to that specific
-- section+subject now, not just grade+subject.
-- ---------------------------------------------------------------------

drop policy if exists weekly_scores_write on weekly_scores;
create policy weekly_scores_write on weekly_scores for all
  using (
    exists (
      select 1 from students st
      where st.id = student_id and st.section_id is not null
        and auth_can_grade_section(st.section_id, subject_id)
    )
  )
  with check (
    exists (
      select 1 from students st
      where st.id = student_id and st.section_id is not null
        and auth_can_grade_section(st.section_id, subject_id)
    )
  );

drop policy if exists exam_scores_write on quarter_exam_scores;
create policy exam_scores_write on quarter_exam_scores for all
  using (
    exists (
      select 1 from students st
      where st.id = student_id and st.section_id is not null
        and auth_can_grade_section(st.section_id, subject_id)
    )
  )
  with check (
    exists (
      select 1 from students st
      where st.id = student_id and st.section_id is not null
        and auth_can_grade_section(st.section_id, subject_id)
    )
  );

-- ---------------------------------------------------------------------
-- Weekly compliance view — must count entries per section, not per
-- whole grade, or one teacher's submitted work would make a sibling
-- section's identical assignment look "done" too.
-- ---------------------------------------------------------------------

create or replace view weekly_entry_counts with (security_invoker = true) as
select
  cst.teacher_id,
  cst.school_id,
  cst.grade_level_id,
  cst.section_id,
  cst.subject_id,
  ws.quarter_id,
  ws.week_number,
  ws.assessment_type,
  count(distinct ws.student_id) as students_with_entries
from class_subject_teachers cst
join students st on st.section_id = cst.section_id
join weekly_scores ws on ws.student_id = st.id and ws.subject_id = cst.subject_id
group by cst.teacher_id, cst.school_id, cst.grade_level_id, cst.section_id, cst.subject_id, ws.quarter_id, ws.week_number, ws.assessment_type;

create or replace view class_roster_size with (security_invoker = true) as
select
  school_id,
  current_grade_level_id as grade_level_id,
  section_id,
  count(*) as student_count
from students
where status = 'active'
group by school_id, current_grade_level_id, section_id;
