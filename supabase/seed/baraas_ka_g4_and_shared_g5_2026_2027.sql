-- =====================================================================
-- Baraas, SY 2026-2027: Kindergarten A and Grade 4 students, and Grade 5
-- shared with every Baraas teacher.
--
-- Run AFTER migration 0013_shared_classes.sql. Paste the whole file into
-- the Supabase SQL Editor and press Run. One transaction: if anything
-- goes wrong, nothing changes.
--
-- 22 students from Baraas's SF1 registers (BAR_KA.xls, BAR_grade_4.xls):
--   Kindergarten A 18 · Grade 4 4   (matches each form's own totals)
--
-- All 18 Kindergarten A children start in Ritchelda Pernia's class (the
-- grade's main class); the form lists them as one section, so a head
-- teacher moves Liezl Canoy's half across from each student's page.
-- Grade 4 has no teacher on the roster yet; a head teacher or admin
-- can still see them.
--
-- Same rules as the other SF1 imports: a student already on file at
-- Baraas (same LRN, or same name and birthdate) is updated, never added
-- twice, and their grade, class and status are left alone.
--
-- Spelling fixed from the forms:
--   - Quiñones, Jayson and Panday, Lyn (KA): middle name typed "Quinones";
--     both mothers are written Quiñones on the same row.
-- Worth checking on the paper register:
--   - Lauyman, Joatham Jr. (KA): middle name Balatan and mother "Balatan,
--     Marleth Quiñones"; his sisters Bella May and Grace have middle
--     name Quiñones and mother "Quiñones, Marleth Balatan". Kept as
--     written.
-- =====================================================================

begin;

drop table if exists _sf1;
create temp table _sf1 (
  school_slug text, grade_code text, lrn text, sex text, last_name text, first_name text,
  middle_name text, suffix text, birthdate date, father_name text, mother_name text,
  mother_tongue text, ip_group text, religion text, home_address text, notes text,
  -- How the student was spelled in an earlier import, when that differs.
  prev_last_name text, prev_first_name text, prev_birthdate date
);

insert into _sf1 values
    -- ===== Agbalite =====
    -- ===== Sulong Ipil =====
    -- ===== Baraas =====
    -- Kindergarten A, Male (7)
    ('baraas', 'KA', '411496260012', 'M', 'Agrumeran', 'Arwen', 'Masinda', null, date '2018-08-06', 'Agrumeran, Noel Malaylay', 'Masinda, Madel Damaso', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260013', 'M', 'Alibasan', 'Resty', 'Lamayor', null, date '2018-03-27', 'Alibasan, Rodel Bernardo', 'Lamayor, Macita Cuzon', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260014', 'M', 'Daguman', 'Ryan', 'Macenda', null, date '2020-12-21', 'Daguman, June Mayuman', 'Macenda, Redita Daguman', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260015', 'M', 'Daguman', 'Sergio', 'Macenda', null, date '2020-09-24', 'Daguman, Rio Mayuman', 'Macenda, Elsa Cuzon', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260016', 'M', 'De Jesus', 'Gerald', 'Acosta', null, date '2018-08-16', 'De Jesus, Jessie Rivas', 'Acosta, Aileen Malaylay', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260017', 'M', 'Lauyman', 'Joatham', 'Balatan', 'Jr.', date '2018-11-15', 'Lauyman, Joatham Gusigyon Sr', 'Balatan, Marleth Quiñones', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260018', 'M', 'Quiñones', 'Jayson', 'Quiñones', null, date '2018-01-14', 'Quiñones, Terso Daguman', 'Quiñones, Gemma Fernando', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    -- Kindergarten A, Female (11)
    ('baraas', 'KA', '411496260001', 'F', 'Alibasan', 'Rodela', 'Lamayor', null, date '2019-11-25', 'Alibasan, Rodel Bernardo', 'Lamayor, Macita Cuzon', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260002', 'F', 'Balatan', 'Kristine', 'Torreliza', null, date '2020-01-20', 'Balatan, Bongyor Quiñones', 'Torreliza, Nene Acosta', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260003', 'F', 'Daguman', 'Angelyn', 'Cuzon', null, date '2019-07-29', 'Daguman, Roniel Mayuman', 'Cuzon, Morena Alibasan', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260004', 'F', 'Daguman', 'Teresa', 'Cuzon', null, date '2018-09-02', 'Daguman, Rio Mayuman', 'Cuzon, Elsa Macenda', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260005', 'F', 'Lauyman', 'Bella May', 'Quiñones', null, date '2017-06-11', 'Lauyman, Joatham Gusigyon', 'Quiñones, Marleth Balatan', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260006', 'F', 'Lauyman', 'Grace', 'Quiñones', null, date '2020-01-19', 'Lauyman, Joatham Gusigyon', 'Quiñones, Marleth Balatan', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260008', 'F', 'Manalo', 'Ariane', 'Fernando', null, date '2021-01-05', 'Manalo, Mario', 'Fernando, Evelyn Macinda', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260007', 'F', 'Masenda', 'Ermila', 'Alibasan', null, date '2020-09-23', 'Masenda, Mandel Damaso', 'Alibasan, Mila Quiñones', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260009', 'F', 'Masinda', 'Angelica', 'Alibasan', null, date '2018-05-13', 'Masinda, Model', 'Alibasan, Mila', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260010', 'F', 'Panday', 'Lyn', 'Quiñones', null, date '2019-06-27', 'Panday, Obed Umalmon', 'Quiñones, Rosinda Balatan', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    ('baraas', 'KA', '411496260011', 'F', 'Quiñones', 'Beberly', 'Fernando', null, date '2017-06-30', 'Quiñones, Adam Daguman', 'Fernando, Florida Masinda', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    -- Grade 4, Male (2)
    ('baraas', 'G4', '110157190003', 'M', 'Lamayor', 'AJ', 'Quiñones', null, date '2013-09-14', 'Lamayor, Enaldo C', 'Quiñones, Ofelia B', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G4', '110157190012', 'M', 'Torreliza', 'Roman', 'Lamayor', null, date '2010-12-18', 'Torreliza, Jerry', 'Lamayor, Lilian', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 4, Female (2)
    ('baraas', 'G4', '110157190004', 'F', 'Manalo', 'Marian', 'Fernando', null, date '2013-12-14', 'Manalo, Mario', 'Fernando, Evelyn Masenda', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G4', '110159190040', 'F', 'Manalo', 'Shaine', 'Maayas', null, date '2013-05-02', 'Manalo, Ramel Masanghiran', 'Maayas, Marlita Damaso', 'Tagalog', 'Alangan', 'Christianity', 'Barangay Casague, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null);

-- Which of these is already on file, at the same school.
drop table if exists _sf1_match;
create temp table _sf1_match as
select r.*, sc.id as school_id, gl.id as grade_level_id,
  (select st.id from students st
   where st.school_id = sc.id
     and (st.lrn = r.lrn
          or (normalize_person_name(st.first_name) = normalize_person_name(r.first_name)
              and normalize_person_name(st.last_name) = normalize_person_name(r.last_name)
              and st.birthdate = r.birthdate)
          or (r.prev_last_name is not null
              and normalize_person_name(st.first_name) = normalize_person_name(r.prev_first_name)
              and normalize_person_name(st.last_name) = normalize_person_name(r.prev_last_name)
              and st.birthdate = r.prev_birthdate))
   order by (st.lrn = r.lrn) desc nulls last, st.created_at
   limit 1) as student_id
from _sf1 r
join schools sc on sc.slug = r.school_slug
join grade_levels gl on gl.code = r.grade_code;

do $$
declare n int;
begin
  select count(*) into n from _sf1_match;
  if n <> 22 then
    raise exception 'Expected 22 students, matched % — a school or grade code is missing from the database', n;
  end if;
end $$;

-- Already on file: bring their details up to the SF1. Names, LRN and
-- birthdate are taken from the form; anything the form leaves blank keeps
-- what was there. Grade, class and status are not touched.
update students st
set lrn = m.lrn,
    last_name = m.last_name,
    first_name = m.first_name,
    middle_name = m.middle_name,
    suffix = m.suffix,
    sex = m.sex,
    birthdate = m.birthdate,
    father_name = coalesce(m.father_name, st.father_name),
    mother_name = coalesce(m.mother_name, st.mother_name),
    mother_tongue = coalesce(m.mother_tongue, st.mother_tongue),
    ip_group = coalesce(m.ip_group, st.ip_group),
    religion = coalesce(m.religion, st.religion),
    home_address = coalesce(m.home_address, st.home_address),
    notes = coalesce(m.notes, st.notes),
    updated_at = now()
from _sf1_match m
where st.id = m.student_id;

-- New: add them, in their grade's main class.
with added as (
  insert into students (
    school_id, current_grade_level_id, lrn, sex, first_name, middle_name, last_name, suffix,
    birthdate, father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes, status
  )
  select school_id, grade_level_id, lrn, sex, first_name, middle_name, last_name, suffix,
         birthdate, father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes, 'active'
  from _sf1_match
  where student_id is null
  returning id, lrn, school_id
)
update _sf1_match m set student_id = a.id
from added a
where m.student_id is null and m.lrn = a.lrn and m.school_id = a.school_id;

alter table _sf1_match add column was_new boolean;
-- now() is fixed for the whole transaction, so this is exactly the rows added above.
update _sf1_match m set was_new = (st.created_at = now())
from students st where st.id = m.student_id;

insert into student_enrollments (student_id, school_id, grade_level_id, school_year_id)
select st.id, st.school_id, st.current_grade_level_id, sy.id
from _sf1_match m
join students st on st.id = m.student_id
cross join (select id from school_years where is_current) sy
where st.current_grade_level_id is not null
on conflict (student_id, school_year_id) do nothing;

-- ---------------------------------------------------------------------
-- Grade 5 has no teacher of its own: share it with every Baraas teacher
-- on the roster (needs migration 0013). Each of them sees the class,
-- takes attendance and enters grades for every subject. Re-running adds
-- anyone new to the roster and changes nothing else.
-- ---------------------------------------------------------------------
insert into class_section_shared_teachers (section_id, teacher_id)
select cs.id, t.id
from class_sections cs
join schools sc on sc.id = cs.school_id and sc.slug = 'baraas'
join grade_levels gl on gl.id = cs.grade_level_id and gl.code = 'G5'
join school_years sy on sy.id = cs.school_year_id and sy.is_current
join teachers t on t.school_id = sc.id and t.active and not t.is_master_admin
where cs.name = 'Main'
on conflict do nothing;

commit;

-- ---------------------------------------------------------------------
-- What you should see: Baraas per class — added from these forms, already
-- on file, and who teaches it. Grade 5 lists every teacher it's shared with.
-- ---------------------------------------------------------------------
select gl.name as "Grade", coalesce(cs.name, '—') as "Class",
       count(distinct st.id) filter (where m.was_new) as "Added",
       count(distinct st.id) filter (where m.student_id is not null and not m.was_new) as "Already on file",
       count(distinct st.id) as "Students",
       coalesce(
         nullif(concat_ws(', ',
           string_agg(distinct t.full_name, ', '),
           string_agg(distinct ts.full_name || ' (shared)', ', ')), ''),
         '— no teacher —') as "Teacher(s)"
from students st
join schools sc on sc.id = st.school_id and sc.slug = 'baraas'
join grade_levels gl on gl.id = st.current_grade_level_id
left join class_sections cs on cs.id = st.section_id
left join class_subject_teachers cst on cst.section_id = cs.id
left join teachers t on t.id = cst.teacher_id
left join class_section_shared_teachers sh on sh.section_id = cs.id
left join teachers ts on ts.id = sh.teacher_id
left join _sf1_match m on m.student_id = st.id
where st.status = 'active'
group by gl.name, gl.sort_order, cs.name
order by gl.sort_order, cs.name;
