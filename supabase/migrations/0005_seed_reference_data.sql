-- =====================================================================
-- Reference data seed — schools, grade levels, subjects, the current
-- school year and its four quarters, and default grade weights.
-- Safe to re-run (uses on conflict do nothing / upsert on the natural
-- keys). Teachers and students are NOT seeded here — see
-- supabase/seed/import-teachers.ts once you have the real roster.
-- =====================================================================

insert into schools (name, slug) values
  ('Agbalite', 'agbalite'),
  ('Binuangan', 'binuangan'),
  ('Pinagbayanan', 'pinagbayanan'),
  ('Sulong Ipil', 'sulong-ipil'),
  ('Baraas', 'baraas')
on conflict (slug) do nothing;

insert into grade_levels (code, name, sort_order) values
  ('KA', 'Kindergarten A', 1),
  ('KB', 'Kindergarten B', 2),
  ('G1', 'Grade 1', 3),
  ('G2', 'Grade 2', 4),
  ('G3', 'Grade 3', 5),
  ('G4', 'Grade 4', 6),
  ('G5', 'Grade 5', 7)
on conflict (code) do nothing;

insert into subjects (code, name, sort_order) values
  ('bible', 'Bible', 1),
  ('math', 'Mathematics', 2),
  ('english', 'English', 3),
  ('filipino', 'Filipino', 4),
  ('science', 'Science', 5),
  ('social_studies', 'Social Studies', 6),
  ('music_arts', 'Music & Arts', 7),
  ('pe_health', 'PE & Health', 8)
on conflict (code) do nothing;

-- School year 2026-2027, per the calendar you gave. NOTE the Q2 exam
-- week below collides with the Dec 21-25 Christmas break because Q2's
-- stated end date (Dec 14) is a Monday, not a Friday — double check
-- this one in the admin calendar screen and adjust exam_week_start /
-- exam_week_end if the actual exam days differ.
insert into school_years (label, start_date, end_date, is_current)
values ('2026-2027', '2026-08-03', '2027-05-21', true)
on conflict (label) do nothing;

insert into quarters (school_year_id, number, name, start_date, end_date, exam_week_start, exam_week_end)
select sy.id, q.number, q.name, q.start_date, q.end_date, q.exam_week_start, q.exam_week_end
from school_years sy
cross join (values
  (1, 'Quarter 1', date '2026-08-03', date '2026-10-02', date '2026-10-05', date '2026-10-09'),
  (2, 'Quarter 2', date '2026-10-12', date '2026-12-14', date '2026-12-15', date '2026-12-19'),
  (3, 'Quarter 3', date '2027-01-11', date '2027-03-12', date '2027-03-15', date '2027-03-19'),
  (4, 'Quarter 4', date '2027-03-22', date '2027-05-14', date '2027-05-17', date '2027-05-21')
) as q(number, name, start_date, end_date, exam_week_start, exam_week_end)
where sy.label = '2026-2027'
on conflict (school_year_id, number) do nothing;

insert into grade_weight_configs (school_year_id, exam_weight, quiz_weight, homework_weight)
select id, 0.850, 0.120, 0.030 from school_years where label = '2026-2027'
on conflict (school_year_id) do nothing;

-- Every school offers every grade level by default; head teachers can
-- flip is_active off per school from the admin screen.
insert into school_grade_levels (school_id, grade_level_id, school_year_id, is_active)
select s.id, gl.id, sy.id, true
from schools s
cross join grade_levels gl
cross join school_years sy
where sy.label = '2026-2027'
on conflict (school_id, grade_level_id, school_year_id) do nothing;
