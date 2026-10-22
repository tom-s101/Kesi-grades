-- =====================================================================
-- Quarterly grades from the scores actually entered.
--
-- Not every week has a quiz. The quiz average has always been taken over
-- the quizzes entered only (weeks with none are simply skipped), and the
-- same for homework/participation. What this changes is a quarter where
-- a whole part has NO scores: it used to count as 0%, quietly costing up
-- to 12 points. Now that part is left out and the remaining weights are
-- scaled back up to 100%:
--
--   all three entered   exam 85% + quizzes 12% + homework 3%  (unchanged)
--   no homework         (exam x 85 + quizzes x 12) / 97
--   no quizzes          (exam x 85 + homework x 3) / 88
--   exam only           the exam score
--
-- A quarterly grade still needs the quarterly exam, as before.
-- final_grades and student_general_average build on this view and follow.
--
-- Safe to re-run.
-- =====================================================================

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
      (
        ex.percentage * gw.exam_weight
        + coalesce(ws.quiz_average, 0) * gw.quiz_weight
        + coalesce(ws.homework_average, 0) * gw.homework_weight
      )
      -- Only the parts that have scores count, and their weights are
      -- scaled back up to 100%: no quizzes at all this quarter means
      -- exam and homework share the whole grade, not a zero for quizzes.
      / (
        gw.exam_weight
        + case when ws.quiz_average is null then 0 else gw.quiz_weight end
        + case when ws.homework_average is null then 0 else gw.homework_weight end
      ),
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
