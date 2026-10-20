-- =====================================================================
-- Faster access checks. Same rules, decided once per query instead of
-- once per row.
--
-- Every read of attendance, scores and grades was checked row by row:
-- for each attendance mark, "may this person see this student?", which
-- itself looked the student up and then their teacher's classes. On a
-- term's worth of data (about 23,000 attendance marks) the attendance
-- totals behind the dashboard and the student list took 3-4 seconds for
-- a teacher, and they grow every school day.
--
-- Two causes, two fixes:
--   1. Read rules now work out the set of students a person may see
--      ONCE (their school if head teacher, their classes otherwise) and
--      compare each row against that set.
--   2. The write rules were declared "for all", which in Postgres means
--      they're also tried on every read, row by row. They're now
--      declared for insert/update/delete only — writes are checked
--      exactly as before.
--
-- Who can see or change what is unchanged.
--
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Set-returning helpers, evaluated once per query.
-- ---------------------------------------------------------------------

-- The school this person is head teacher of, if any.
create or replace function auth_head_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from teachers
  where id = auth.uid() and is_head_teacher and active;
$$;

-- Every class this person teaches, or shares (0013).
create or replace function auth_section_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select section_id from class_subject_teachers where teacher_id = auth.uid()
  union
  select section_id from class_section_shared_teachers where teacher_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Students: the one place the "who may see whom" rule lives. Everything
-- else below reads "a student you can see".
-- ---------------------------------------------------------------------

drop policy if exists students_read on students;
create policy students_read on students for select
  using (
    (select auth_is_master_admin())
    or school_id = (select auth_head_school_id())
    or section_id in (select auth_section_ids())
  );

drop policy if exists students_update on students;
create policy students_update on students for update
  using (
    (select auth_is_master_admin())
    or school_id = (select auth_head_school_id())
    or section_id in (select auth_section_ids())
  )
  with check (
    (select auth_is_master_admin())
    or school_id = (select auth_head_school_id())
    or section_id in (select auth_section_ids())
  );

-- ---------------------------------------------------------------------
-- Attendance: read = any student you can see; write = as before.
-- ---------------------------------------------------------------------

drop policy if exists attendance_read on attendance_records;
create policy attendance_read on attendance_records for select
  using (student_id in (select id from students));

drop policy if exists attendance_write on attendance_records;
drop policy if exists attendance_insert on attendance_records;
drop policy if exists attendance_update on attendance_records;
drop policy if exists attendance_delete on attendance_records;
create policy attendance_insert on attendance_records for insert
  with check (auth_can_access_student(student_id));
create policy attendance_update on attendance_records for update
  using (auth_can_access_student(student_id))
  with check (auth_can_access_student(student_id));
create policy attendance_delete on attendance_records for delete
  using (auth_can_access_student(student_id));

-- ---------------------------------------------------------------------
-- Weekly scores and exam scores: read = any student you can see; write
-- = the teacher of that class and subject (or head teacher / admin), as
-- in 0009/0013.
-- ---------------------------------------------------------------------

drop policy if exists weekly_scores_read on weekly_scores;
create policy weekly_scores_read on weekly_scores for select
  using (student_id in (select id from students));

drop policy if exists weekly_scores_write on weekly_scores;
drop policy if exists weekly_scores_insert on weekly_scores;
drop policy if exists weekly_scores_update on weekly_scores;
drop policy if exists weekly_scores_delete on weekly_scores;
create policy weekly_scores_insert on weekly_scores for insert
  with check (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)));
create policy weekly_scores_update on weekly_scores for update
  using (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)))
  with check (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)));
create policy weekly_scores_delete on weekly_scores for delete
  using (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)));

drop policy if exists exam_scores_read on quarter_exam_scores;
create policy exam_scores_read on quarter_exam_scores for select
  using (student_id in (select id from students));

drop policy if exists exam_scores_write on quarter_exam_scores;
drop policy if exists exam_scores_insert on quarter_exam_scores;
drop policy if exists exam_scores_update on quarter_exam_scores;
drop policy if exists exam_scores_delete on quarter_exam_scores;
create policy exam_scores_insert on quarter_exam_scores for insert
  with check (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)));
create policy exam_scores_update on quarter_exam_scores for update
  using (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)))
  with check (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)));
create policy exam_scores_delete on quarter_exam_scores for delete
  using (exists (
    select 1 from students st
    where st.id = student_id and st.section_id is not null
      and auth_can_grade_section(st.section_id, subject_id)));

-- ---------------------------------------------------------------------
-- Enrolment history: readable for any student you can see; written by
-- head teachers and admins only, as before.
-- ---------------------------------------------------------------------

drop policy if exists enrollments_read on student_enrollments;
create policy enrollments_read on student_enrollments for select
  using (student_id in (select id from students));

drop policy if exists enrollments_write on student_enrollments;
drop policy if exists enrollments_insert on student_enrollments;
drop policy if exists enrollments_update on student_enrollments;
drop policy if exists enrollments_delete on student_enrollments;
create policy enrollments_insert on student_enrollments for insert
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));
create policy enrollments_update on student_enrollments for update
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id))
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));
create policy enrollments_delete on student_enrollments for delete
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

-- ---------------------------------------------------------------------
-- Quarterly grades: same columns, same numbers, worked out in one pass.
-- The old view ran two separate look-ups (quiz average, homework
-- average) for every student x subject x quarter; this averages all of
-- a quarter's scores in a single grouped pass and joins the result.
-- Checked row-for-row against the old view: identical. The dashboard's
-- quarter chart went from ~175 ms to ~17 ms for an admin on a term's
-- data. (final_grades and student_general_average build on this view
-- and speed up with it.)
-- ---------------------------------------------------------------------

create or replace view quarterly_grades with (security_invoker = true) as
select
  s.id as student_id,
  q.id as quarter_id,
  q.school_year_id,
  q.number as quarter_number,
  subj.id as subject_id,
  subj.name as subject_name,
  ex.percentage as exam_percentage,
  ws.quiz_average,
  ws.homework_average,
  coalesce(ws.quiz_entry_count, 0) as quiz_entry_count,
  coalesce(ws.homework_entry_count, 0) as homework_entry_count,
  gw.exam_weight,
  gw.quiz_weight,
  gw.homework_weight,
  case
    when ex.percentage is null then null
    else round(
      ex.percentage * gw.exam_weight
      + coalesce(ws.quiz_average, 0) * gw.quiz_weight
      + coalesce(ws.homework_average, 0) * gw.homework_weight,
    2)
  end as quarterly_grade
from students s
cross join quarters q
cross join subjects subj
join grade_weight_configs gw on gw.school_year_id = q.school_year_id
left join quarter_exam_scores ex
  on ex.student_id = s.id and ex.quarter_id = q.id and ex.subject_id = subj.id
left join (
  select student_id, quarter_id, subject_id,
         avg(percentage) filter (where assessment_type = 'quiz') as quiz_average,
         avg(percentage) filter (where assessment_type = 'homework_participation') as homework_average,
         count(*) filter (where assessment_type = 'quiz') as quiz_entry_count,
         count(*) filter (where assessment_type = 'homework_participation') as homework_entry_count
  from weekly_scores
  group by student_id, quarter_id, subject_id
) ws on ws.student_id = s.id and ws.quarter_id = q.id and ws.subject_id = subj.id;

-- ---------------------------------------------------------------------
-- Indexes for the lookups above and the attendance totals.
-- ---------------------------------------------------------------------

create index if not exists attendance_year_student_idx on attendance_records(school_year_id, student_id);
create index if not exists cs_shared_section_idx on class_section_shared_teachers(section_id);
create index if not exists cst_teacher_section_idx on class_subject_teachers(teacher_id, section_id);
