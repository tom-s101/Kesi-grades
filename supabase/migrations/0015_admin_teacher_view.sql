-- =====================================================================
-- Teacher view for admins.
--
-- A master admin who also teaches a class (Tom Imperio, Agbalite Grade 4)
-- can switch to being an ordinary teacher and back, from the sidebar —
-- to use the site day to day as a teacher, or to show someone exactly
-- what a teacher sees.
--
-- While acting_as_teacher is on, the admin is a regular teacher in every
-- respect, enforced by the database and not just hidden on screen: every
-- admin check goes through auth_is_master_admin(), which now says no.
-- They see and grade only their own classes.
--
-- is_master_admin still records that they ARE an admin; it's what lets
-- them switch back. Nobody without it gets the switch, and switching
-- grants nothing they didn't already have.
--
-- Safe to re-run.
-- =====================================================================

alter table teachers add column if not exists acting_as_teacher boolean not null default false;

create or replace function auth_is_master_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_master_admin and not acting_as_teacher from teachers where id = auth.uid()),
    false);
$$;

-- Only the admin themselves (or another admin) may flip their switch: a
-- head teacher can edit teachers at their school, but not this.
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

  if new.acting_as_teacher is distinct from old.acting_as_teacher and new.id <> auth.uid() then
    raise exception 'Only the admin themselves can switch between admin and teacher view';
  end if;

  return new;
end;
$$;
