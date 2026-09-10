-- =====================================================================
-- Migration 4 of 4: row-level security
--
-- Model:
--   - master admin (teachers.is_master_admin)  -> sees/edits everything
--   - head teacher (teachers.is_head_teacher)  -> sees/edits everything
--     within their own school, can override any lower teacher's entries
--   - regular teacher                          -> sees/edits only the
--     students in the (school, grade_level) combinations they are
--     assigned to teach via class_subject_teachers
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions (security definer so they can read `teachers` /
-- `class_subject_teachers` even though RLS on those tables would
-- otherwise block a plain policy subquery from seeing other rows).
-- ---------------------------------------------------------------------

create or replace function auth_is_master_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_master_admin from teachers where id = auth.uid()), false);
$$;

create or replace function auth_is_head_teacher_of(target_school uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from teachers
    where id = auth.uid() and is_head_teacher and school_id = target_school
  );
$$;

create or replace function auth_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from teachers where id = auth.uid();
$$;

-- True if the caller has some assignment (as a subject teacher) that
-- covers this school+grade combination.
create or replace function auth_teaches_grade(target_school uuid, target_grade uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_subject_teachers
    where teacher_id = auth.uid() and school_id = target_school and grade_level_id = target_grade
  );
$$;

-- True if the caller may view/edit a given student (master admin, head
-- teacher of that school, or a teacher assigned to that student's grade).
create or replace function auth_can_access_student(target_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth_is_master_admin() then true
    else exists (
      select 1 from students st
      where st.id = target_student
        and (
          auth_is_head_teacher_of(st.school_id)
          or auth_teaches_grade(st.school_id, st.current_grade_level_id)
        )
    )
  end;
$$;

-- True if the caller may enter grades for this school+grade+subject
-- combination specifically (must be the assigned subject teacher, the
-- school's head teacher, or master admin).
create or replace function auth_can_grade(target_school uuid, target_grade uuid, target_subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    auth_is_master_admin()
    or auth_is_head_teacher_of(target_school)
    or exists (
      select 1 from class_subject_teachers
      where teacher_id = auth.uid() and school_id = target_school
        and grade_level_id = target_grade and subject_id = target_subject
    );
$$;

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------

alter table schools enable row level security;
alter table grade_levels enable row level security;
alter table subjects enable row level security;
alter table school_years enable row level security;
alter table quarters enable row level security;
alter table school_grade_levels enable row level security;
alter table grade_weight_configs enable row level security;
alter table teachers enable row level security;
alter table class_subject_teachers enable row level security;
alter table students enable row level security;
alter table student_enrollments enable row level security;
alter table attendance_records enable row level security;
alter table weekly_scores enable row level security;
alter table quarter_exam_scores enable row level security;

-- ---------------------------------------------------------------------
-- Reference data: readable by any signed-in teacher, writable only by
-- master admin.
-- ---------------------------------------------------------------------

create policy ref_read_schools on schools for select using (auth.uid() is not null);
create policy ref_write_schools on schools for all using (auth_is_master_admin()) with check (auth_is_master_admin());

create policy ref_read_grade_levels on grade_levels for select using (auth.uid() is not null);
create policy ref_write_grade_levels on grade_levels for all using (auth_is_master_admin()) with check (auth_is_master_admin());

create policy ref_read_subjects on subjects for select using (auth.uid() is not null);
create policy ref_write_subjects on subjects for all using (auth_is_master_admin()) with check (auth_is_master_admin());

create policy ref_read_school_years on school_years for select using (auth.uid() is not null);
create policy ref_write_school_years on school_years for all using (auth_is_master_admin()) with check (auth_is_master_admin());

create policy ref_read_quarters on quarters for select using (auth.uid() is not null);
create policy ref_write_quarters on quarters for all using (auth_is_master_admin()) with check (auth_is_master_admin());

create policy ref_read_weights on grade_weight_configs for select using (auth.uid() is not null);
create policy ref_write_weights on grade_weight_configs for all using (auth_is_master_admin()) with check (auth_is_master_admin());

-- Head teachers can toggle grade levels on/off for their own school.
create policy sgl_read on school_grade_levels for select using (auth.uid() is not null);
create policy sgl_write on school_grade_levels for all
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id))
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

-- ---------------------------------------------------------------------
-- Teachers: everyone can read the roster (needed to show "assigned to
-- Mrs. X"); only master admin (or the head teacher of that school, for
-- non-admin fields like reassignment) can write. Teachers may update
-- a narrow set of their own fields (handled at the app layer since
-- column-level RLS needs a separate policy per statement type).
-- ---------------------------------------------------------------------

create policy teachers_read on teachers for select using (auth.uid() is not null);

create policy teachers_write_admin on teachers for all
  using (auth_is_master_admin())
  with check (auth_is_master_admin());

create policy teachers_update_self on teachers for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy teachers_update_head on teachers for update
  using (auth_is_head_teacher_of(school_id))
  with check (auth_is_head_teacher_of(school_id));

-- ---------------------------------------------------------------------
-- Class assignments
-- ---------------------------------------------------------------------

create policy cst_read on class_subject_teachers for select using (auth.uid() is not null);

create policy cst_write on class_subject_teachers for all
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id))
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

-- ---------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------

create policy students_read on students for select
  using (
    auth_is_master_admin()
    or auth_is_head_teacher_of(school_id)
    or auth_teaches_grade(school_id, current_grade_level_id)
  );

create policy students_write on students for all
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id))
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

create policy enrollments_read on student_enrollments for select
  using (
    auth_is_master_admin()
    or auth_is_head_teacher_of(school_id)
    or auth_teaches_grade(school_id, grade_level_id)
  );

create policy enrollments_write on student_enrollments for all
  using (auth_is_master_admin() or auth_is_head_teacher_of(school_id))
  with check (auth_is_master_admin() or auth_is_head_teacher_of(school_id));

-- ---------------------------------------------------------------------
-- Attendance — any teacher assigned to the student's grade can record
-- it (elementary homeroom model); head teacher/master admin can always
-- override.
-- ---------------------------------------------------------------------

create policy attendance_read on attendance_records for select
  using (auth_can_access_student(student_id));

create policy attendance_write on attendance_records for all
  using (auth_can_access_student(student_id))
  with check (auth_can_access_student(student_id));

-- ---------------------------------------------------------------------
-- Grades — must be entered by the teacher assigned to that specific
-- subject (or head teacher / master admin override).
-- ---------------------------------------------------------------------

create policy weekly_scores_read on weekly_scores for select
  using (auth_can_access_student(student_id));

create policy weekly_scores_write on weekly_scores for all
  using (
    exists (
      select 1 from students st
      where st.id = student_id and auth_can_grade(st.school_id, st.current_grade_level_id, subject_id)
    )
  )
  with check (
    exists (
      select 1 from students st
      where st.id = student_id and auth_can_grade(st.school_id, st.current_grade_level_id, subject_id)
    )
  );

create policy exam_scores_read on quarter_exam_scores for select
  using (auth_can_access_student(student_id));

create policy exam_scores_write on quarter_exam_scores for all
  using (
    exists (
      select 1 from students st
      where st.id = student_id and auth_can_grade(st.school_id, st.current_grade_level_id, subject_id)
    )
  )
  with check (
    exists (
      select 1 from students st
      where st.id = student_id and auth_can_grade(st.school_id, st.current_grade_level_id, subject_id)
    )
  );
