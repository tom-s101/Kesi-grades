-- =====================================================================
-- Agbalite student roster, SY 2026-2027 — 46 students, transcribed from
-- KESI_Agbalite_Student_Roster_SY2026-2027.pdf (source: School Form 1
-- School Register, compiled from handwritten register sheets).
--
-- Safe to re-run: skips any student who already matches on
-- (school, first name, last name, middle name, birthdate).
--
-- Three records had illegible/missing handwriting on the original
-- forms (marked "—" in the PDF) and are inserted with NULL here:
--   - Calbe, Jepoy (KB): birthdate and mother's maiden name missing
--   - Parisan, Mark Andrey (KB): father's name missing
--   - Parisan, Bernie Jr. (G2): father's name missing
-- Fix these from the physical register once you have it in front of
-- you — edit the student on their profile page, no SQL needed.
-- =====================================================================

with roster (grade_code, sex, last_name, first_name, middle_name, suffix, birthdate, father_name, mother_name) as (
  values
    -- Kindergarten - Section A, Male (13)
    ('KA', 'M', 'Calbe',       'Jernel',     'Parisan',    null, date '2019-03-22', 'Calbe, Jimboy Parisan',        'Parisan, Mellite Parisan'),
    ('KA', 'M', 'Calve',       'Janleo',     'Parisan',    null, date '2018-03-30', 'Calve, Tario Tungkarawin',     'Parisan, Helen Calve'),
    ('KA', 'M', 'Calve',       'Sedrick',    'Lagnaan',    null, date '2017-02-28', 'Calve, Alvin Parisan',         'Lagnaan, Cedy Parisan'),
    ('KA', 'M', 'Calve',       'Nelmar',     'Parisan',    null, date '2018-12-18', 'Calve, Noel Tungkarawin',      'Parisan, Mary Gilagid'),
    ('KA', 'M', 'Parisan',     'Adrel',      'Parisan',    null, date '2019-01-18', 'Parisan, Lado Parisan',        'Parisan, Susan Tamisan'),
    ('KA', 'M', 'Parisan',     'Allen',      'Parisan',    null, date '2017-09-28', 'Parisan, Arnel Parisan',       'Parisan, Evamae Cubil'),
    ('KA', 'M', 'Parisan',     'Amiel',      'Parisan',    null, date '2020-07-14', 'Parisan, Arnel Parisan',       'Parisan, Evamae Cubil'),
    ('KA', 'M', 'Parisan',     'Kenneth',    'Cabcaan',    null, date '2018-08-08', 'Parisan, Arnel Parisan',       'Cabcaan, Mercing Calbe'),
    ('KA', 'M', 'Tamisan',     'Francis',    'Cabcaan',    null, date '2014-11-05', 'Tamisan, Modie Tobias',        'Cabcaan, Liway Parisan'),
    ('KA', 'M', 'Tamisan',     'Jericho',    'Parisan',    null, date '2016-12-19', 'Tamisan, Diner Parisan',       'Parisan, Blanca Bunsuan'),
    ('KA', 'M', 'Tamisan',     'Renzlee',    'Cabcaan',    null, date '2019-10-30', 'Tamisan, Modie Tobias',        'Cabcaan, Liway Parisan'),
    ('KA', 'M', 'Tampulayan',  'Jorince',    'Tampulayan', null, date '2018-11-23', 'Tampulayan, Jonas Tamisan',    'Tampulayan, Rhea Balicadong'),
    ('KA', 'M', 'Tampulayan',  'Pungay',     'Cabcaan',    null, date '2019-05-01', 'Tampulayan, Rolan Tamisan',    'Cabcaan, Maymae Parisan'),
    -- Kindergarten - Section A, Female (9)
    ('KA', 'F', 'Cabcaan',     'Ressie',     'Parisan',    null, date '2017-09-06', 'Cabcaan, Mandie Parisan',      'Parisan, Erly Calve'),
    ('KA', 'F', 'Calbe',       'Eunice',     'Solita',     null, date '2018-06-26', 'Calbe, Ferdinand',             'Solita, Jonnaveth Tamisan'),
    ('KA', 'F', 'Parisan',     'Ivy',        'Parisan',    null, date '2016-05-01', 'Parisan, Fernan Sr. Villanueva','Parisan, Bebeth Tamisan'),
    ('KA', 'F', 'Parisan',     'Cecil',      'Tamisan',    null, date '2015-03-30', 'Parisan, Melanio Gilagid',     'Tamisan, Noemi Parisan'),
    ('KA', 'F', 'Parisan',     'Janice',     'Tamisan',    null, date '2019-01-27', 'Parisan, Silver Calve',        'Tamisan, Ellen Tobias'),
    ('KA', 'F', 'Parisan',     'Jasmin',     'Tamisan',    null, date '2017-05-09', 'Parisan, Silver Calve',        'Tamisan, Ellen Tobias'),
    ('KA', 'F', 'Tamisan',     'Alaiza',     'Tobias',     null, date '2013-12-17', 'Tamisan, Carling Parisan',     'Tobias, Avelina Liwayan'),
    ('KA', 'F', 'Villanueva',  'Jenie',      'Casula',     null, date '2019-09-16', 'Villanueva, Bernie Parisan',   'Casula, Jessica Sambutan'),
    ('KA', 'F', 'Villanueva',  'Margie',     'Cabcaan',    null, date '2018-11-08', 'Villanueva, Marco Parisan',    'Cabcaan, Vilma Parisan'),

    -- Kindergarten - Section B, Male (7)
    ('KB', 'M', 'Calbe',       'Jepoy',      'Parisan',    null, null,               'Calve, Anthony Parisan',       null),
    ('KB', 'M', 'Parisan',     'Arvin',      'Parisan',    null, date '2014-05-01', 'Parisan, Lado Parisan',        'Parisan, Susan Tamisan'),
    ('KB', 'M', 'Parisan',     'Mark',       'Andrey',     null, date '2013-09-02', null,                           'Parisan, Lolith Tamisan'),
    ('KB', 'M', 'Tampulayan',  'Lenard',     'Cabcaan',    null, date '2017-03-01', 'Tampulayan, Rolan Tamisan',    'Cabcaan, Maymae Parisan'),
    ('KB', 'M', 'Tamisan',     'Randel',     'Cabcaan',    null, date '2016-07-23', 'Tamisan, Modie Tobias',        'Cabcaan, Liway Parisan'),
    ('KB', 'M', 'Villanueva',  'Brendon',    'Parisan',    null, date '2015-10-21', 'Villanueva, Heron Parisan',    'Parisan, Miranda Gilagid'),
    ('KB', 'M', 'Villanueva',  'Rex',        'Cabcaan',    null, date '2016-12-02', 'Villanueva, Marco Parisan',    'Cabcaan, Vilma Parisan'),
    -- Kindergarten - Section B, Female (3)
    ('KB', 'F', 'Cabcaan',     'Mecy',       'Parisan',    null, date '2015-02-26', 'Cabcaan, Mandic Parisan',      'Parisan, Erly Calve'),
    ('KB', 'F', 'Calbe',       'Teresa',     'Parisan',    null, date '2016-08-26', 'Calbe, Jimboy Parisan',        'Parisan, Melitte Parisan'),
    ('KB', 'F', 'Parisan',     'Narcisa',    'Tamisan',    null, date '2013-06-12', 'Parisan, Melanio Gilagid',     'Tamisan, Noemi Parisan'),

    -- Grade 1, Male (3)
    ('G1', 'M', 'Calve',       'Jerico',     'Parisan',    null, date '2015-12-21', 'Calve, Noel Tungkarawin',      'Parisan, Mary Gilagid'),
    ('G1', 'M', 'Calve',       'Jimuel',     'Lagnaan',    null, date '2014-08-11', 'Calve, Alvin Parisan',         'Lagnaan, Cedy Parisan'),
    ('G1', 'M', 'Calve',       'John Carlo', 'Parisan',    null, date '2015-05-06', 'Calve, Tario Tungkarawin',     'Parisan, Helen Calve'),
    -- Grade 1, Female (4)
    ('G1', 'F', 'Calve',       'Nanet',      'Parisan',    null, date '2012-06-18', 'Calve, Tario Tungkarawin',     'Parisan, Helen Calve'),
    ('G1', 'F', 'Parisan',     'Isel',       'Parisan',    null, date '2014-03-14', 'Parisan, Fermin Sr. Villanueva','Parisan, Bebeth Tamisan'),
    ('G1', 'F', 'Reyes',       'Nicky',      'Parisan',    null, date '2016-03-18', 'Reyes, Wanie Vasquez',         'Parisan, Racquel Tungkarawin'),
    ('G1', 'F', 'Villanueva',  'Marilyn',    'Cabcaan',    null, date '2014-12-19', 'Villanueva, Marco Parisan',    null),

    -- Grade 2, Male (1)
    ('G2', 'M', 'Parisan',     'Bernie',     null,         'Jr.', date '2015-12-21', null,                          'Parisan, Lolith Tamisan'),
    -- Grade 2, Female (1)
    ('G2', 'F', 'Calve',       'Jesabel',    'Parisan',    null, date '2014-08-06', 'Calve, Noel Tungkarawin',      'Parisan, Mary Gilagid'),

    -- Grade 3, Male (1)
    ('G3', 'M', 'Villanueva',  'Melvin',     'Parisan',    null, date '2013-05-15', 'Villanueva, Heron Parisan',    'Parisan, Miranda Gilagid'),
    -- Grade 3, Female (2)
    ('G3', 'F', 'Parisan',     'Bea',        'Parisan',    null, date '2011-07-08', 'Parisan, Fernan Sr. Villanueva','Parisan, Bebeth Tamisan'),
    ('G3', 'F', 'Tampulayan',  'Erica',      'Cabcaan',    null, date '2013-12-12', 'Tampulayan, Rolan Tamisan',    'Cabcaan, Maymae Parisan'),

    -- Grade 4, Male (1)
    ('G4', 'M', 'Parisan',     'Miguel',     'Tamisan',    null, date '2011-12-05', 'Parisan, Melanio Gilagid',     'Tamisan, Noemi Parisan'),
    -- Grade 4, Female (1)
    ('G4', 'F', 'Calocaan',    'Jelyn',      'Parisan',    null, date '2010-10-30', 'Calocaan, Mondie Parisan',     'Parisan, Erly Calve')
),
agbalite as (
  select id as school_id from schools where slug = 'agbalite'
),
inserted as (
  insert into students (
    school_id, current_grade_level_id, sex, first_name, middle_name, last_name, suffix,
    birthdate, father_name, mother_name, mother_tongue, ip_group, religion, home_address, status
  )
  select
    a.school_id,
    gl.id,
    r.sex, r.first_name, r.middle_name, r.last_name, r.suffix,
    r.birthdate, r.father_name, r.mother_name,
    'Tagalog', 'Iraya', 'Christianity',
    'Purok Agbalite, Barangay Harisson, Paluan, Occidental Mindoro',
    'active'
  from roster r
  cross join agbalite a
  join grade_levels gl on gl.code = r.grade_code
  where not exists (
    select 1 from students s
    where s.school_id = a.school_id
      and s.first_name = r.first_name
      and s.last_name = r.last_name
      and s.middle_name is not distinct from r.middle_name
      and s.birthdate is not distinct from r.birthdate
  )
  returning id, school_id, current_grade_level_id
)
insert into student_enrollments (student_id, school_id, grade_level_id, school_year_id)
select i.id, i.school_id, i.current_grade_level_id, sy.id
from inserted i
cross join (select id from school_years where is_current) sy
on conflict (student_id, school_year_id) do nothing;
