-- =====================================================================
-- Lets any teacher who can see a student (not just the head teacher or
-- master admin) fix data-entry mistakes — misspelled names, a wrong
-- birthdate, parent/guardian info — since those get typed in from
-- handwritten registers and typos are expected. Reassigning a student
-- to a different grade/school, or changing their enrollment status
-- (dropped/transferred/completed), stays restricted to the school's
-- head teacher or master admin: a trigger enforces that regardless of
-- which RLS policy let the UPDATE through, the same way
-- 0006_teacher_privilege_guard.sql locks down role changes on
-- `teachers`.
-- =====================================================================

create or replace function guard_student_sensitive_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth_is_master_admin() or auth_is_head_teacher_of(old.school_id) then
    return new;
  end if;

  if new.school_id is distinct from old.school_id
     or new.current_grade_level_id is distinct from old.current_grade_level_id
     or new.status is distinct from old.status then
    raise exception 'Only a head teacher or master admin can change a student''s grade, school, or status';
  end if;

  return new;
end;
$$;

create trigger students_guard_sensitive_columns
  before update on students
  for each row execute function guard_student_sensitive_columns();

-- Replace the single "for all" write policy with per-action policies so
-- update can be opened up to any teacher with access while insert/delete
-- stay restricted to head teacher / master admin.
drop policy if exists students_write on students;

create policy students_insert on students for insert
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

create policy students_delete on students for delete
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

create policy students_update on students for update
  using (
    auth_is_master_admin()
    or auth_is_head_teacher_of(school_id)
    or auth_teaches_grade(school_id, current_grade_level_id)
  )
  with check (
    auth_is_master_admin()
    or auth_is_head_teacher_of(school_id)
    or auth_teaches_grade(school_id, current_grade_level_id)
  );
