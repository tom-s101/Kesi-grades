-- =====================================================================
-- Sign-in by name.
--
-- Teachers now log in by typing their name plus a password, instead of
-- picking a campus and their name from a list. Everyone starts on the
-- shared password set by supabase/seed/teachers_2026_2027.sql, and the
-- app offers (but doesn't force) a change of password after sign-in.
--
-- password_changed_at is how the app knows the difference: null means
-- the teacher is still on the shared starting password, so they get
-- the "set your own password" prompt. It's also what stops a re-run of
-- the roster script from resetting a password a teacher chose
-- themselves.
--
-- Safe to re-run.
-- =====================================================================

alter table teachers add column if not exists password_changed_at timestamptz;

-- How names are compared at sign-in: case, accents, punctuation and
-- extra spaces don't matter, so "ann  inahid" finds "Ann Inahid". The
-- app applies the same rule in src/lib/names.ts — keep the two in step.
create extension if not exists unaccent with schema extensions;

create or replace function normalize_person_name(raw text)
returns text language sql stable set search_path = public, extensions as $$
  select trim(regexp_replace(lower(extensions.unaccent(coalesce(raw, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;
