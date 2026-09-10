# DepEd alignment — what's built-in, what's your call

This is a private school system, not a DepEd system of record, so it's built
to *help you produce* DepEd-compliant paperwork rather than to enforce DepEd
rules you didn't ask for. A few things worth knowing:

## Grading weights (85% exam / 12% quiz / 3% homework)

This is **your** weighting policy, not DepEd's official K-12 matrix. DepEd's
standard (DO 8, s. 2015) splits grades into Written Work / Performance Task /
Quarterly Assessment, with the percentages varying by subject group (e.g.
Languages 30/50/20, Math & Science 40/40/20). Your quiz/homework/exam
categories don't map one-to-one onto that.

If you ever need report cards that are officially submitted through DepEd's
own channels, you have two options — both supported without a schema change:
1. Keep your current three categories but relabel them to WW/PT/QA in the
   printed report (cosmetic change in `report-card/[id]/page.tsx`).
2. Add a fourth `assessment_type` for a separate Performance Task category
   and adjust `grade_weight_configs` per subject. The weights table already
   lives in the database (`grade_weight_configs`, one row per school year)
   specifically so this can change without touching code — update the row,
   or extend the table to be per-subject if DepEd requires subject-specific
   splits.

## Performance descriptors & passing mark

`src/lib/grades.ts` (`remarkFor`) implements DepEd's standard bands from
DO 8, s. 2015: Outstanding (90+), Very Satisfactory (85–89), Satisfactory
(80–84), Fairly Satisfactory (75–79), Did Not Meet Expectations (below 75).
Passing mark is 75, matching DepEd's K-12 standard. These are plain
constants — easy to adjust if your policy differs.

## Heads up: DepEd's SY 2026–2027 calendar changed

While researching this, I found DepEd Order 9, s. 2026 moved public schools
to a **3-term** calendar (Term 1/2/3) for SY 2026–2027, replacing the
4-quarter structure. The dates and quarters you gave me are 4 quarters, so
that's what's built (`supabase/migrations/0005_seed_reference_data.sql`).
As a private school you aren't necessarily bound to the new public-school
calendar, but if you do need to submit an official SF9 in the new 3-term
format at some point, the cleanest path is a small mapping table (each
DepEd "term" = one or two of your quarters) rather than changing your
internal grading periods — ask and I can add it.

One more thing to double check yourself: **Quarter 2's exam week
(Dec 15–19, 2026) is seeded right up against the Dec 21–25 Christmas break**,
because your stated Q2 end date (Dec 14) is a Monday rather than a Friday.
Verify the real Q2 exam dates and adjust the `quarters` row in Supabase if
needed — see `docs/SUPABASE_SETUP.md` for how.

## LRN and other identifiers

`students.lrn` holds the DepEd Learner Reference Number so it can be printed
on report cards and transferred onto official forms — it's optional in the
schema since not every enrolled student may have one yet (e.g. new
Kindergarten entrants), but is shown on the report card whenever present.

## Attendance policy (3 absences = drop, 5 lates = absence)

This is your stated school policy, encoded in
`supabase/migrations/0003_views.sql` (`student_attendance_summary`) and
mirrored client-side in `src/lib/attendance.ts`. It is not a DepEd mandate —
DepEd's own rule of thumb for private schools is generally that a student
must attend a minimum number of the total school days to be promoted, without
prescribing your specific "3 absences" threshold. Adjust the constants in
`lib/attendance.ts` (`DROP_THRESHOLD_ABSENCES`, `LATES_PER_ABSENCE`) and the
matching numbers in the SQL view if this policy ever changes.
