-- =====================================================================
-- Baraas Kindergarten A: Liezl Canoy assists Ritchelda Pernia.
--
-- Run AFTER migration 0013_shared_classes.sql. Paste the whole file into
-- the Supabase SQL Editor and press Run. One transaction: if anything
-- goes wrong, nothing changes. Safe to re-run.
--
-- Liezl gets Ritchelda's Kindergarten A class as a shared class: she
-- sees all its students, takes attendance and enters grades for every
-- subject, just as Ritchelda does. Ritchelda stays the class teacher.
--
-- The separate, empty "Canoy" Kindergarten A class the teacher roster
-- first set up for Liezl is taken away, so she doesn't see an empty
-- class next to the real one. If any student was moved into it in the
-- meantime, they're moved back to Ritchelda's class first.
-- =====================================================================

begin;

do $$
declare
  sy_id     uuid;
  baraas    uuid;
  ka        uuid;
  liezl     uuid;
  ritchelda uuid;
  main_cls  uuid;
begin
  select id into sy_id from school_years where is_current;
  select id into baraas from schools where slug = 'baraas';
  select id into ka from grade_levels where code = 'KA';
  select id into liezl from teachers
    where normalize_person_name(full_name) = normalize_person_name('Liezl Canoy') and school_id = baraas;
  select id into ritchelda from teachers
    where normalize_person_name(full_name) = normalize_person_name('Ritchelda Pernia') and school_id = baraas;

  if liezl is null or ritchelda is null then
    raise exception 'Liezl Canoy and Ritchelda Pernia must both be on file at Baraas — run teachers_2026_2027.sql first.';
  end if;

  -- Ritchelda's class: the Kindergarten A class she teaches, else the
  -- grade's main class.
  select coalesce(
    (select cst.section_id from class_subject_teachers cst
     where cst.teacher_id = ritchelda and cst.school_id = baraas
       and cst.grade_level_id = ka and cst.school_year_id = sy_id
     limit 1),
    (select cs.id from class_sections cs
     where cs.school_id = baraas and cs.grade_level_id = ka
       and cs.school_year_id = sy_id and cs.name = 'Main')
  ) into main_cls;

  if main_cls is null then
    raise exception 'No Kindergarten A class found at Baraas for this school year.';
  end if;

  -- Anyone moved into Liezl's own class goes back to Ritchelda's.
  update students st
  set section_id = main_cls
  from class_sections cs
  where st.section_id = cs.id
    and cs.school_id = baraas and cs.grade_level_id = ka and cs.school_year_id = sy_id
    and cs.id <> main_cls
    and cs.id in (select section_id from class_subject_teachers where teacher_id = liezl);

  -- Liezl no longer has a Kindergarten A class of her own...
  delete from class_subject_teachers
  where teacher_id = liezl and school_id = baraas and grade_level_id = ka and school_year_id = sy_id;

  -- ...so the empty "Canoy" class can go too.
  delete from class_sections cs
  where cs.school_id = baraas and cs.grade_level_id = ka and cs.school_year_id = sy_id
    and cs.id <> main_cls
    and cs.name = 'Canoy'
    and not exists (select 1 from students st where st.section_id = cs.id)
    and not exists (select 1 from class_subject_teachers x where x.section_id = cs.id);

  -- ...and shares Ritchelda's instead.
  insert into class_section_shared_teachers (section_id, teacher_id)
  values (main_cls, liezl)
  on conflict do nothing;
end $$;

commit;

-- What you should see: Baraas Kindergarten A with its students,
-- Ritchelda as class teacher and Liezl sharing it.
select gl.name as "Grade", cs.name as "Class",
       (select count(*) from students st where st.section_id = cs.id and st.status = 'active') as "Students",
       (select string_agg(distinct t.full_name, ', ') from class_subject_teachers cst
          join teachers t on t.id = cst.teacher_id where cst.section_id = cs.id) as "Class teacher",
       (select string_agg(t.full_name, ', ') from class_section_shared_teachers sh
          join teachers t on t.id = sh.teacher_id where sh.section_id = cs.id) as "Shared with"
from class_sections cs
join schools sc on sc.id = cs.school_id and sc.slug = 'baraas'
join grade_levels gl on gl.id = cs.grade_level_id and gl.code = 'KA'
join school_years sy on sy.id = cs.school_year_id and sy.is_current
order by cs.sort_order, cs.name;
