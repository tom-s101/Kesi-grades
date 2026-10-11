-- =====================================================================
-- Pinagbayanan student roster, SY 2026-2027 — 34 students,
-- Kindergarten A through Grade 4, from the school's School Form 1 (SF1)
-- registers (Kinder_A_Pin.xls, Kinder_B_Pin.xls, Grade_1_Pin.xls ...
-- Grade_4_Pin.xls).
--
--   Kindergarten A 10 · Kindergarten B 3 · Grade 1 5 · Grade 2 8
--   Grade 3 4 · Grade 4 4   (matches each form's own totals)
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to re-run: a student already on file (same LRN, or same name and
-- birthdate at Pinagbayanan) is skipped, never duplicated.
--
-- Everyone lands in their grade's main class.
--
-- GRADE 4 HAS NO TEACHER YET. The teacher roster
-- (teachers_2026_2027.sql) gives Pinagbayanan Kindergarten A, B and
-- Grades 1-3 only, so these 4 students are visible to a head teacher
-- or admin but to no class teacher until someone is assigned.
--
-- Corrected from the forms:
--   - Pandac, Zyra (G3): mother's surname typed "Pulaan"; her own
--     middle name, which is her mother's surname, is Punlaan.
-- Worth checking on the paper register:
--   - Laurente, Akiah Shanel (G2) and Laurente, Izeiah Gwenn (KB) list
--     their mother as "Nadera, Ma Nonita" and "Nadera, Ma Nenita"
--     respectively. Kept as written; fix whichever is wrong on the
--     student's page.
--   - Parisan, Ismael (born 2012) and Ronday, Bong (born 2011) are in
--     Kindergarten A.
--   - Two addresses are outside Paluan (Ronday, Aliandro Jerzion:
--     Tayamaan, Mamburao; Yoro, Johanan: Sulib, Pangil, Laguna) —
--     probably where they transferred from.
--   - 15 students are marked transferred-in (14 still "pending" on the
--     form); that's recorded in their notes.
-- =====================================================================

with roster (grade_code, lrn, sex, last_name, first_name, middle_name, birthdate,
             father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes) as (
  values
    -- Kindergarten A, Male (5)
    ('KA', '429508260004', 'M', 'Gatmaitan', 'Jero', 'Solita', date '2018-08-17', 'Gatmaitan, Dennis Villanueva', 'Solita, Inday Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '169525200012', 'M', 'Gatmaitan', 'Renan', 'Solita', date '2014-12-31', 'Gatmaitan, Dennis Villanueva', 'Solita, Inday Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429508260005', 'M', 'Mameldang', 'Bernard', 'Delos Reyes', date '2017-12-30', 'Mameldang, Ronald Cabcaan', 'Delos Reyes, Mayet Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429508260006', 'M', 'Parisan', 'Ismael', 'Punlaan', date '2012-05-12', 'Parisan, Dino Casula', 'Punlaan, Leah Casula', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429508260007', 'M', 'Ronday', 'Bong', 'Parisan', date '2011-08-06', 'Ronday, Seleno Zurita', 'Parisan, Marilou Pandac', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Kindergarten A, Female (5)
    ('KA', '429508260008', 'F', 'Gatmaitan', 'Jera', 'Solita', date '2018-08-17', 'Gatmaitan, Dennis Villanueva', 'Solita, Inday Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429508260009', 'F', 'Gatmaitan', 'Leigh Ella', 'Delos Reyes', date '2018-01-07', 'Gatmaitan, Willie Villanueva', 'Delos Reyes, Maribel Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429508260010', 'F', 'Parisan', 'Aizel', 'Bulayan', date '2019-01-24', 'Parisan, Marlon Bunsuan', 'Bulayan, Sandy Cabcaan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429508260011', 'F', 'Villanueva', 'Jenny', 'Parisan', date '2015-10-13', 'Villanueva, Lody Casula', 'Parisan, Maria Mameldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429508260012', 'F', 'Villanueva', 'Vanessa', 'Parisan', date '2018-07-10', 'Villanueva, Jayson Liwayan', 'Parisan, Maria Mameldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Kindergarten B, Male (2)
    ('KB', '429508260001', 'M', 'Runday', 'Jarren', 'Punlaan', date '2016-12-03', 'Runday, Ariel Zolita', 'Punlaan, Lorena Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429508260002', 'M', 'Villanueva', 'Jhon Jay', 'Panaligan', date '2015-11-21', 'Villanueva, Jordan Liwayan', 'Panaligan, Vivian Tungkarawin', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Kindergarten B, Female (1)
    ('KB', '429508260003', 'F', 'Laurente', 'Izeiah Gwenn', 'Nadera', date '2019-08-08', 'Laurente, Jorlan Luntao', 'Nadera, Ma Nenita Acid', 'Tagalog', null, 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 1, Male (3)
    ('G1', '429508250002', 'M', 'Ronday', 'Aliandro Jerzion', 'Surigao', date '2018-02-24', 'Ronday, Jerome Gatmaitan', 'Surigao, Anjelica Monzales', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Tayamaan, Mamburao, Occidental Mindoro', 'Transferred in 2026-08-03'),
    ('G1', '429508240001', 'M', 'Runday', 'Carlo', 'Punlaan', date '2013-12-20', 'Runday, Ariel Zolita', 'Punlaan, Lorena Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '169525250029', 'M', 'Villanueva', 'Jonas', 'Pandac', date '2017-05-26', 'Villanueva, Lody Casula', 'Pandac, Marilou Dela Cruz', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    -- Grade 1, Female (2)
    ('G1', '429508250001', 'F', 'Runday', 'Bernadette', 'Punlaan', date '2014-12-28', 'Runday, Ariel Zolita', 'Punlaan, Lorena Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '169525240030', 'F', 'Villanueva', 'Micah', 'Pandac', date '2018-07-03', 'Villanueva, Lody Casula', 'Pandac, Marilou Dela Cruz', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    -- Grade 2, Male (5)
    ('G2', '169525230048', 'M', 'Conde', 'Bryan', 'Punlaan', date '2017-10-15', 'Conde, Daniel Parisan', 'Punlaan, Ana Tungkarawin', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G2', '110050210014', 'M', 'Gatmaitan', 'Manny', 'Delos Reyes', date '2013-06-03', 'Gatmaitan, Willie Villanueva', 'Delos Reyes, Maribel Parisan', 'Filipino', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G2', '110050210012', 'M', 'Gatmaitan', 'Nick', 'Delos Reyes', date '2015-05-25', 'Gatmaitan, Willie Villanueva', 'Delos Reyes, Maribel Parisan', 'Filipino', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G2', '169525220002', 'M', 'Tungkarawin', 'Jernel', 'Pandac', date '2011-11-08', 'Tungkarawin, Onoy Parisan', 'Pandac, Ofelia Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G2', '169525230050', 'M', 'Tungkarawin', 'Joshua', 'Dela Cruz', date '2016-01-21', 'Tungkarawin, Ronnie Yuda', 'Dela Cruz, Inday Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    -- Grade 2, Female (3)
    ('G2', '429508230004', 'F', 'Laurente', 'Akiah Shanel', 'Nadera', date '2016-05-02', 'Laurente, Jorlan Luntao', 'Nadera, Ma Nonita Acid', 'Tagalog', null, 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429508210001', 'F', 'Parisan', 'Laizel', 'Bulayan', date '2015-05-11', 'Parisan, Marlon Bunsuan', 'Bulayan, Sandy Cabcaan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '169525220001', 'F', 'Tungkarawin', 'Kathleen', 'Pandac', date '2012-12-10', 'Tungkarawin, Onoy Parisan', 'Pandac, Ofelia Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    -- Grade 3, Male (3)
    ('G3', '429512190016', 'M', 'Runday', 'Jonathan', 'Punlaan', date '2011-01-05', 'Runday, Ariel Zolita', 'Punlaan, Lorena Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G3', '169525190020', 'M', 'Villanueva', 'Gelo', 'Pandac', date '2014-01-08', 'Villanueva, Lody Casula', 'Pandac, Marilou Dela Cruz', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G3', '169525230044', 'M', 'Villanueva', 'Jayvie', 'Panaligan', date '2017-10-07', 'Villanueva, Jordan Liwayan', 'Panaligan, Vivian Tungkarawin', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    -- Grade 3, Female (1)
    ('G3', '169525200008', 'F', 'Pandac', 'Zyra', 'Punlaan', date '2013-04-17', 'Pandac, Arman Villanueva', 'Punlaan, Lolit Casula', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    -- Grade 4, Male (3)
    ('G4', '169525150026', 'M', 'Parisan', 'Baron', 'Lagnaan', date '2010-03-06', 'Parisan, Dino', 'Lagnaan, Leah', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G4', '169525180016', 'M', 'Villanueva', 'John Cedric', 'Pandac', date '2012-05-05', 'Villanueva, Lodie Parisan', 'Parisan, Marilou Pandac', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G4', '108404220107', 'M', 'Yoro', 'Johanan', 'Trapse', date '2016-03-31', 'Yoro, Leo Jhon Ponayo', 'Trapse, Sunshine Lopez', 'Tagalog', null, 'Christianity', 'Barangay Sulib, Pangil, Laguna', null),
    -- Grade 4, Female (1)
    ('G4', '169525200015', 'F', 'Villanueva', 'Kriselda', 'Pandac', date '2014-03-02', 'Villanueva, Menio Casula', 'Pandac, Hilda Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)')
),
pinagbayanan as (
  select id as school_id from schools where slug = 'pinagbayanan'
),
inserted as (
  insert into students (
    school_id, current_grade_level_id, lrn, sex, first_name, middle_name, last_name,
    birthdate, father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes, status
  )
  select
    b.school_id, gl.id, r.lrn, r.sex, r.first_name, r.middle_name, r.last_name,
    r.birthdate, r.father_name, r.mother_name, r.mother_tongue, r.ip_group, r.religion,
    r.home_address, r.notes, 'active'
  from roster r
  cross join pinagbayanan b
  join grade_levels gl on gl.code = r.grade_code
  where not exists (
    select 1 from students s
    where s.lrn = r.lrn
       or (s.school_id = b.school_id
           and lower(s.first_name) = lower(r.first_name)
           and lower(s.last_name) = lower(r.last_name)
           and s.birthdate is not distinct from r.birthdate)
  )
  returning id, school_id, current_grade_level_id
)
insert into student_enrollments (student_id, school_id, grade_level_id, school_year_id)
select i.id, i.school_id, i.current_grade_level_id, sy.id
from inserted i
cross join (select id from school_years where is_current) sy
on conflict (student_id, school_year_id) do nothing;

-- What you should see: Pinagbayanan's active students per class, and the
-- teacher each class belongs to.
select gl.name as "Grade", cs.name as "Class", count(distinct st.id) as "Students",
       coalesce(max(t.full_name), '— no teacher —') as "Teacher"
from students st
join schools s on s.id = st.school_id and s.slug = 'pinagbayanan'
join grade_levels gl on gl.id = st.current_grade_level_id
left join class_sections cs on cs.id = st.section_id
left join class_subject_teachers cst on cst.section_id = cs.id
left join teachers t on t.id = cst.teacher_id
where st.status = 'active'
group by gl.name, gl.sort_order, cs.name
order by gl.sort_order, cs.name;
