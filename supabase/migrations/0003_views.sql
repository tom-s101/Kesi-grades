-- =====================================================================
-- Migration 3 of 4: computed views — grades and attendance
-- =====================================================================

-- ---------------------------------------------------------------------
-- Quarterly grade per student/subject/quarter:
--   exam% * exam_weight + avg(quiz%) * quiz_weight + avg(hw%) * hw_weight
-- Weights come from grade_weight_configs (default 85/12/3). A quarter
-- with no exam score yet returns null so the UI can show "incomplete"
-- rather than a misleading partial grade.
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
  quiz.avg_percentage as quiz_average,
  hw.avg_percentage as homework_average,
  quiz.entry_count as quiz_entry_count,
  hw.entry_count as homework_entry_count,
  gw.exam_weight,
  gw.quiz_weight,
  gw.homework_weight,
  case
    when ex.percentage is null then null
    else round(
      ex.percentage * gw.exam_weight
      + coalesce(quiz.avg_percentage, 0) * gw.quiz_weight
      + coalesce(hw.avg_percentage, 0) * gw.homework_weight,
    2)
  end as quarterly_grade
from students s
cross join quarters q
cross join subjects subj
join grade_weight_configs gw on gw.school_year_id = q.school_year_id
left join quarter_exam_scores ex
  on ex.student_id = s.id and ex.quarter_id = q.id and ex.subject_id = subj.id
left join lateral (
  select avg(percentage) as avg_percentage, count(*) as entry_count
  from weekly_scores ws
  where ws.student_id = s.id and ws.quarter_id = q.id and ws.subject_id = subj.id
    and ws.assessment_type = 'quiz'
) quiz on true
left join lateral (
  select avg(percentage) as avg_percentage, count(*) as entry_count
  from weekly_scores ws
  where ws.student_id = s.id and ws.quarter_id = q.id and ws.subject_id = subj.id
    and ws.assessment_type = 'homework_participation'
) hw on true;

-- Final grade per student/subject/school year = average of the 4
-- quarterly grades that exist (DepEd convention).
create or replace view final_grades with (security_invoker = true) as
select
  student_id,
  school_year_id,
  subject_id,
  subject_name,
  round(avg(quarterly_grade), 2) as final_grade,
  count(quarterly_grade) as quarters_completed
from quarterly_grades
group by student_id, school_year_id, subject_id, subject_name;

-- A student's overall general average across all subjects, per quarter
-- and for the year — the headline number on report cards.
create or replace view student_general_average with (security_invoker = true) as
select
  student_id,
  school_year_id,
  quarter_id,
  quarter_number,
  round(avg(quarterly_grade), 2) as general_average,
  count(quarterly_grade) as subjects_completed
from quarterly_grades
group by student_id, school_year_id, quarter_id, quarter_number;

-- ---------------------------------------------------------------------
-- Attendance summary per student/school year.
-- Absence math: Mon-Thu, a missed session counts half a day; Friday
-- (morning-only) a missed session counts a full day. Every 5 lates
-- converts to 1 additional effective absence, per school policy.
-- ---------------------------------------------------------------------

create or replace view attendance_daily with (security_invoker = true) as
select
  student_id,
  school_year_id,
  attendance_date,
  (case when extract(dow from attendance_date) = 5 then 1 else 2 end) as sessions_expected,
  count(*) filter (where status = 'present') as sessions_present,
  count(*) filter (where status = 'late') as sessions_late,
  count(*) filter (where status = 'absent') as sessions_absent,
  (case when extract(dow from attendance_date) = 5 then 1.0 else 0.5 end)
    * count(*) filter (where status = 'absent') as absence_days
from attendance_records
group by student_id, school_year_id, attendance_date;

create or replace view student_attendance_summary with (security_invoker = true) as
select
  student_id,
  school_year_id,
  sum(sessions_late) as total_lates,
  sum(absence_days) as direct_absence_days,
  floor(sum(sessions_late) / 5.0) as absences_from_lates,
  round(sum(absence_days) + floor(sum(sessions_late) / 5.0), 2) as effective_absences,
  (sum(absence_days) + floor(sum(sessions_late) / 5.0)) >= 2 as at_warning,
  (sum(absence_days) + floor(sum(sessions_late) / 5.0)) >= 3 as should_be_dropped
from attendance_daily
group by student_id, school_year_id;

-- ---------------------------------------------------------------------
-- Weekly compliance: how many quiz / homework entries exist per
-- teacher assignment per week of a quarter. The app compares this
-- against the expected week list (lib/quarters.ts) to flag gaps.
-- ---------------------------------------------------------------------

create or replace view weekly_entry_counts with (security_invoker = true) as
select
  cst.teacher_id,
  cst.school_id,
  cst.grade_level_id,
  cst.subject_id,
  ws.quarter_id,
  ws.week_number,
  ws.assessment_type,
  count(distinct ws.student_id) as students_with_entries
from class_subject_teachers cst
join weekly_scores ws on ws.subject_id = cst.subject_id
join students st on st.id = ws.student_id and st.current_grade_level_id = cst.grade_level_id
  and st.school_id = cst.school_id
group by cst.teacher_id, cst.school_id, cst.grade_level_id, cst.subject_id, ws.quarter_id, ws.week_number, ws.assessment_type;

create or replace view class_roster_size with (security_invoker = true) as
select
  school_id,
  current_grade_level_id as grade_level_id,
  count(*) as student_count
from students
where status = 'active'
group by school_id, current_grade_level_id;
