-- =====================================================================
-- Two fixes that together unblock normal day-to-day admin work.
-- Safe to re-run.
--
-- 1. The guard triggers from 0006/0008 refuse any change to a
--    student's grade/section/status or a teacher's role whenever
--    auth.uid() is null. That's meant to stop a signed-in regular
--    teacher from escalating — but auth.uid() is ALSO null for
--    trusted server-side work: the service-role key the app uses, the
--    WhatsApp webhook, and anything you run yourself in the Supabase
--    SQL editor. So as written, nobody could move a student to
--    another grade or mark one dropped from those paths. The guards
--    now apply only when there actually is a signed-in user to police.
--
-- 2. Students imported by plain SQL (like the Agbalite SF1 roster)
--    have no section, and teacher access / grade entry / attendance
--    all filter by section — so those students are invisible to every
--    teacher and can't be graded. A trigger now fills in the grade's
--    default class whenever one isn't supplied, instead of relying on
--    whoever writes the next import remembering to.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Guards apply to signed-in users only
-- ---------------------------------------------------------------------

create or replace function guard_student_sensitive_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No signed-in user => trusted server-side context (service role,
  -- SQL editor). Nothing to police.
  if auth.uid() is null then
    return new;
  end if;

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

create or replace function guard_teacher_privilege_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if auth_is_master_admin() then
    return new;
  end if;

  if new.is_master_admin is distinct from old.is_master_admin
     or new.is_head_teacher is distinct from old.is_head_teacher
     or new.school_id is distinct from old.school_id then
    raise exception 'Only a master admin can change role or school assignment for a teacher';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Every student lands in a class
-- ---------------------------------------------------------------------

create or replace function set_default_student_section()
returns trigger language plpgsql as $$
declare
  resolved uuid;
begin
  -- No grade yet -> no class to be in.
  if new.current_grade_level_id is null then
    new.section_id := null;
    return new;
  end if;

  -- Keep an explicitly chosen section, as long as it belongs to this
  -- student's school and grade.
  if new.section_id is not null and exists (
    select 1 from class_sections cs
    where cs.id = new.section_id
      and cs.school_id = new.school_id
      and cs.grade_level_id = new.current_grade_level_id
  ) then
    return new;
  end if;

  -- Otherwise fall back to the grade's default class for the current
  -- school year ("Main" if it's there, else the lowest-ordered one).
  select cs.id into resolved
  from class_sections cs
  join school_years sy on sy.id = cs.school_year_id and sy.is_current
  where cs.school_id = new.school_id
    and cs.grade_level_id = new.current_grade_level_id
  order by (cs.name = 'Main') desc, cs.sort_order, cs.name
  limit 1;

  new.section_id := resolved;
  return new;
end;
$$;

drop trigger if exists students_default_section on students;
create trigger students_default_section
  before insert or update of school_id, current_grade_level_id, section_id on students
  for each row execute function set_default_student_section();

-- Repair anyone already stranded without a class.
update students s
set section_id = cs.id
from class_sections cs
join school_years sy on sy.id = cs.school_year_id and sy.is_current
where s.section_id is null
  and s.current_grade_level_id is not null
  and cs.school_id = s.school_id
  and cs.grade_level_id = s.current_grade_level_id
  and cs.name = 'Main';
