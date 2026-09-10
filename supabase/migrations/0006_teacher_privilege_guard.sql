-- =====================================================================
-- Closes a privilege-escalation gap: the `teachers_update_head` RLS
-- policy (migration 4) lets a head teacher update any teacher row in
-- their own school, but RLS has no column-level granularity — without
-- this trigger a head teacher could flip is_master_admin, promote
-- themselves to head teacher of a school they don't run, or move a
-- teacher's school_id. Only master admin may change those three
-- fields; everything else (name, whatsapp number, active flag) stays
-- editable by the school's head teacher as intended.
-- =====================================================================

create or replace function guard_teacher_privilege_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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

create trigger teachers_guard_privilege_columns
  before update on teachers
  for each row execute function guard_teacher_privilege_columns();
