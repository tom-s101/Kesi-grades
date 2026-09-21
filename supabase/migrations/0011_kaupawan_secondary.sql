-- =====================================================================
-- Kaupawan — the sixth campus, and the only one that runs Grades 6–12.
--
-- The other five campuses stay Kindergarten A through Grade 5, so this
-- deliberately does NOT switch the new grade levels on everywhere: it
-- activates 6–12 at Kaupawan only, and leaves (or turns off) the
-- primary grades there.
--
-- Safe to re-run.
-- =====================================================================

insert into schools (name, slug) values ('Kaupawan', 'kaupawan')
on conflict (slug) do nothing;

insert into grade_levels (code, name, sort_order) values
  ('G6',  'Grade 6',  8),
  ('G7',  'Grade 7',  9),
  ('G8',  'Grade 8',  10),
  ('G9',  'Grade 9',  11),
  ('G10', 'Grade 10', 12),
  ('G11', 'Grade 11', 13),
  ('G12', 'Grade 12', 14)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Which grades each campus offers
-- ---------------------------------------------------------------------

-- Kaupawan: Grades 6–12 on.
insert into school_grade_levels (school_id, grade_level_id, school_year_id, is_active)
select s.id, gl.id, sy.id, true
from schools s
cross join grade_levels gl
cross join school_years sy
where s.slug = 'kaupawan'
  and gl.code in ('G6','G7','G8','G9','G10','G11','G12')
  and sy.is_current
on conflict (school_id, grade_level_id, school_year_id)
do update set is_active = true;

-- Kaupawan: the primary grades off (it has no kindergarten intake).
update school_grade_levels sgl
set is_active = false
from schools s, grade_levels gl
where sgl.school_id = s.id and sgl.grade_level_id = gl.id
  and s.slug = 'kaupawan'
  and gl.code in ('KA','KB','G1','G2','G3','G4','G5');

-- Everywhere else: the secondary grades off. Guards against an earlier
-- re-run of 0005, whose cross join would otherwise switch every grade
-- on at every school once 6–12 exist.
update school_grade_levels sgl
set is_active = false
from schools s, grade_levels gl
where sgl.school_id = s.id and sgl.grade_level_id = gl.id
  and s.slug <> 'kaupawan'
  and gl.code in ('G6','G7','G8','G9','G10','G11','G12');

-- ---------------------------------------------------------------------
-- A default class for every grade Kaupawan now offers, so students and
-- teaching assignments have somewhere to land (same rule as 0009).
-- ---------------------------------------------------------------------

insert into class_sections (school_id, grade_level_id, school_year_id, name, sort_order)
select sgl.school_id, sgl.grade_level_id, sgl.school_year_id, 'Main', 1
from school_grade_levels sgl
where sgl.is_active
on conflict (school_id, grade_level_id, school_year_id, name) do nothing;
