-- =====================================================================
-- Teacher roster, SY 2026-2027 — every campus.
--
-- Run AFTER migration 0012_teacher_name_login.sql. Paste the whole file
-- into the Supabase SQL Editor and press Run. It is one transaction:
-- if anything is wrong, nothing changes.
--
-- What it does:
--   1. Makes sure every teacher below has a login. They sign in by
--      typing their name, and their starting password is
--      "trueeducation". The login email is made up and never shown to
--      anyone; nothing is ever sent to it.
--   2. Fixes the spelling of anyone already on file under the same name,
--      and moves them to the campus listed here.
--   3. Gives each teacher their classes, with every subject. When two
--      teachers share a grade (Kindergarten A at Baraas and at
--      Binuangan), the first one listed keeps the grade's existing
--      class (and its students); the second gets a new class named
--      after them. A head teacher moves students into it from the
--      student's page.
--   4. Switches off any teacher at these campuses who is NOT on this
--      list, so they can no longer sign in. Nothing is deleted — their
--      past entries stay. Master admins are never switched off.
--
-- Safe to re-run. A teacher who has already set their own password
-- keeps it; only people still on the starting password are reset.
--
-- To change the roster later, edit the list below and run it again.
-- =====================================================================

begin;

drop table if exists _roster;
create temp table _roster (
  ord             int generated always as identity,
  school_slug     text not null,
  full_name       text not null,
  grade_codes     text[] not null,
  is_head_teacher boolean not null default false
);

insert into _roster (school_slug, full_name, grade_codes, is_head_teacher) values
  -- Baraas
  ('baraas',       'Ritchelda Pernia',        '{KA}',      false),
  ('baraas',       'Liezl Canoy',             '{KA}',      false),
  ('baraas',       'Marie Victor',            '{KB}',      false),
  ('baraas',       'Norie Gabo',              '{G1}',      false),
  ('baraas',       'Mhae Marcha',             '{G2,G3}',   false),
  -- Sulong Ipil
  ('sulong-ipil',  'Nora Senerser',           '{KA,KB}',   false),
  ('sulong-ipil',  'Annette Gustafson',       '{G1}',      false),
  ('sulong-ipil',  'Theresa Unsell',          '{G3}',      false),
  ('sulong-ipil',  'Dolor Momo',              '{G4,G5}',   false),
  -- Pinagbayanan
  ('pinagbayanan', 'Isabel Cantuba',          '{KA}',      false),
  ('pinagbayanan', 'Bryan Cantuba',           '{KB}',      false),
  ('pinagbayanan', 'Ben Ramos',               '{G1}',      false),
  ('pinagbayanan', 'Shiela Delmo',            '{G2,G3}',   false),
  -- Kaupawan — Larry and Winnie run Grades 7-12 together, so each gets
  -- their own login as head teacher: both see and grade every class.
  ('kaupawan',     'Larry Tabianan',          '{}',        true),
  ('kaupawan',     'Winnie Tabianan',         '{}',        true),
  -- Binuangan
  ('binuangan',    'Cris Magallano',          '{KA}',      false),
  ('binuangan',    'Brigette Landao',         '{KA}',      false),
  ('binuangan',    'Liany Fajardo',           '{KB}',      false),
  ('binuangan',    'Prince Shad Famisaran',   '{G1}',      false),
  ('binuangan',    'Claris Linto',            '{G2}',      false),
  ('binuangan',    'Lobert Fajardo',          '{G3,G4}',   false),
  ('binuangan',    'Tracy Celestre',          '{G5}',      false),
  -- Agbalite
  ('agbalite',     'Janet Mansiwagan',        '{KA}',      false),
  ('agbalite',     'Alojah Inahid',           '{KB}',      false),
  ('agbalite',     'Ann Inahid',              '{G1,G2}',   false),
  ('agbalite',     'Kevin Fernando',          '{G3}',      false),
  ('agbalite',     'Tom Imperio',             '{G4}',      false);

-- Which teachers row each line above ended up as.
drop table if exists _roster_ids;
create temp table _roster_ids (ord int primary key, teacher_id uuid not null);

do $$
declare
  default_password constant text := 'trueeducation';
  sy_id   uuid;
  r       record;
  t_id    uuid;
  login   text;
  bad     text;
begin
  select id into sy_id from school_years where is_current;
  if sy_id is null then
    raise exception 'No current school year — run the migrations first.';
  end if;

  -- Typos in the list above stop everything before anything changes.
  select string_agg(distinct school_slug, ', ') into bad
  from _roster where school_slug not in (select slug from schools);
  if bad is not null then raise exception 'Unknown campus: %', bad; end if;

  select string_agg(distinct g.code, ', ') into bad
  from _roster, unnest(grade_codes) as g(code)
  where g.code not in (select gl.code from grade_levels gl);
  if bad is not null then raise exception 'Unknown grade: %', bad; end if;

  select string_agg(full_name, ', ') into bad from (
    select min(full_name) full_name from _roster
    group by normalize_person_name(full_name) having count(*) > 1
  ) d;
  if bad is not null then
    raise exception 'Listed twice: % — sign-in is by name, so every name must be different.', bad;
  end if;

  -- ---------------------------------------------------------------
  -- 1-2. A login and a teachers row for everyone on the list
  -- ---------------------------------------------------------------
  for r in
    select ro.*, s.id as school_id from _roster ro join schools s on s.slug = ro.school_slug order by ro.ord
  loop
    -- Already on file under this name? Prefer the one at this campus.
    select t.id into t_id
    from teachers t
    where normalize_person_name(t.full_name) = normalize_person_name(r.full_name)
    order by (t.school_id = r.school_id) desc nulls last, t.active desc, t.created_at
    limit 1;

    if t_id is null then
      login := replace(normalize_person_name(r.full_name), ' ', '.') || '@teachers.kesi.local';

      -- An earlier run may have made the login already.
      select id into t_id from auth.users where email = login;

      if t_id is null then
        t_id := gen_random_uuid();
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new,
          email_change, email_change_token_current, phone_change,
          phone_change_token, reauthentication_token
        ) values (
          '00000000-0000-0000-0000-000000000000', t_id, 'authenticated', 'authenticated',
          login, extensions.crypt(default_password, extensions.gen_salt('bf')),
          now(), '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', r.full_name),
          now(), now(),
          '', '', '', '', '', '', '', ''
        );

        insert into auth.identities (
          provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) values (
          t_id::text, t_id,
          jsonb_build_object('sub', t_id::text, 'email', login, 'email_verified', true),
          'email', now(), now(), now()
        );
      end if;

      insert into teachers (id, full_name, school_id, is_head_teacher, active)
      values (t_id, r.full_name, r.school_id, r.is_head_teacher, true)
      on conflict (id) do nothing;
    end if;

    update teachers
    set full_name = r.full_name,
        school_id = r.school_id,
        is_head_teacher = is_head_teacher or r.is_head_teacher,
        active = true
    where id = t_id;

    -- Starting password for anyone who hasn't chosen their own yet.
    update auth.users u
    set encrypted_password = extensions.crypt(default_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(u.email_confirmed_at, now()),
        updated_at = now()
    from teachers t
    where t.id = t_id and u.id = t.id and t.password_changed_at is null;

    insert into _roster_ids values (r.ord, t_id);
  end loop;

  -- ---------------------------------------------------------------
  -- 4. Anyone at these campuses who isn't on the list can't sign in
  -- ---------------------------------------------------------------
  update teachers t
  set active = false
  where t.school_id in (select s.id from schools s where s.slug in (select school_slug from _roster))
    and not t.is_master_admin
    and t.id not in (select teacher_id from _roster_ids);

  -- ---------------------------------------------------------------
  -- 3. Classes: clear this year's assignments at these campuses and
  --    rebuild them from the list
  -- ---------------------------------------------------------------
  delete from class_subject_teachers cst
  where cst.school_year_id = sy_id
    and cst.school_id in (select s.id from schools s where s.slug in (select school_slug from _roster));

  -- Make sure each grade is switched on where someone teaches it.
  insert into school_grade_levels (school_id, grade_level_id, school_year_id, is_active)
  select distinct s.id, gl.id, sy_id, true
  from _roster ro
  join schools s on s.slug = ro.school_slug
  cross join unnest(ro.grade_codes) as g(code)
  join grade_levels gl on gl.code = g.code
  on conflict (school_id, grade_level_id, school_year_id) do update set is_active = true;

  -- One class per teacher per grade: the first teacher listed for a
  -- grade gets its "Main" class, anyone after them a class of their own.
  drop table if exists _classes;
  create temp table _classes as
  select
    ri.teacher_id, s.id as school_id, gl.id as grade_level_id,
    case when row_number() over (partition by s.id, gl.id order by ro.ord) = 1
      then 'Main'
      else regexp_replace(trim(ro.full_name), '^.*\s', '')
    end as section_name,
    row_number() over (partition by s.id, gl.id order by ro.ord) as sort_order
  from _roster ro
  join _roster_ids ri on ri.ord = ro.ord
  join schools s on s.slug = ro.school_slug
  cross join unnest(ro.grade_codes) as g(code)
  join grade_levels gl on gl.code = g.code;

  insert into class_sections (school_id, grade_level_id, school_year_id, name, sort_order)
  select school_id, grade_level_id, sy_id, section_name, sort_order from _classes
  on conflict (school_id, grade_level_id, school_year_id, name) do nothing;

  -- A homeroom teacher covers every subject for their class.
  insert into class_subject_teachers (school_id, grade_level_id, section_id, subject_id, school_year_id, teacher_id)
  select c.school_id, c.grade_level_id, cs.id, sub.id, sy_id, c.teacher_id
  from _classes c
  join class_sections cs
    on cs.school_id = c.school_id and cs.grade_level_id = c.grade_level_id
   and cs.school_year_id = sy_id and cs.name = c.section_name
  cross join subjects sub;
end $$;

commit;

-- ---------------------------------------------------------------------
-- What you should see: one row per teacher with their classes, and
-- "Signs in?" = yes. Any row marked NO TEACHER is a class at one of
-- these campuses that has students but nobody assigned to it.
-- ---------------------------------------------------------------------
select
  s.name                                            as "Campus",
  t.full_name                                       as "Teacher",
  case when t.is_head_teacher then 'Head teacher — whole campus'
       else coalesce(string_agg(distinct gl.name || case when cs.name <> 'Main' then ' (' || cs.name || ')' else '' end, ', '), '—')
  end                                               as "Classes",
  case when t.active then 'yes' else 'no' end       as "Signs in?",
  case when t.password_changed_at is null then 'trueeducation' else '(their own)' end as "Password"
from teachers t
join schools s on s.id = t.school_id
left join class_subject_teachers cst on cst.teacher_id = t.id
  and cst.school_year_id = (select id from school_years where is_current)
left join class_sections cs on cs.id = cst.section_id
left join grade_levels gl on gl.id = cst.grade_level_id
where t.active
group by s.name, t.id, t.full_name, t.is_head_teacher, t.active, t.password_changed_at

union all

select s.name, 'NO TEACHER', gl.name || case when cs.name <> 'Main' then ' (' || cs.name || ')' else '' end,
       count(st.id)::text || ' students', ''
from class_sections cs
join schools s on s.id = cs.school_id
join grade_levels gl on gl.id = cs.grade_level_id
join students st on st.section_id = cs.id and st.status = 'active'
where cs.school_year_id = (select id from school_years where is_current)
  and not exists (select 1 from class_subject_teachers x where x.section_id = cs.id)
  and not exists (select 1 from teachers h where h.school_id = cs.school_id and h.is_head_teacher and h.active)
group by s.name, gl.name, cs.name, gl.sort_order

order by 1, 2;
