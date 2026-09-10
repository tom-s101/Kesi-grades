# KESI — Katutubo Excel Schools

Grade reporting, attendance, and analytics for KESI's five campuses
(Agbalite, Binuangan, Pinagbayanan, Sulong Ipil, Baraas), from Kindergarten
through Grade 5.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4) — frontend + server
  logic (server actions, route handlers) in one deployable app.
- **Supabase** (Postgres + Auth) — database, row-level security, and login.
- **Recharts** — analytics charts.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's keys
npm run dev
```

The app expects a Supabase project with the schema in
`supabase/migrations/` already applied — see
**[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** for the full setup
(creating the project, running migrations, importing your teacher roster).

Other docs:
- **[docs/DEPED_COMPLIANCE.md](docs/DEPED_COMPLIANCE.md)** — what's DepEd-
  aligned out of the box, and what's your school's own policy.
- **[docs/WHATSAPP_INTEGRATION.md](docs/WHATSAPP_INTEGRATION.md)** — the
  WhatsApp grade/attendance bot: what it does, and the Meta setup steps only
  you can complete.

## How the data model fits together

- **`schools` / `grade_levels` / `subjects`** — fixed reference data (seeded
  once, editable by master admin).
- **`school_years` / `quarters`** — your 2026–2027 calendar, seeded from the
  dates you gave. `grade_weight_configs` holds the 85/12/3 exam/quiz/
  homework split per school year, so it can change without a code deploy.
- **`teachers`** — one row per login, linked 1:1 to a Supabase Auth user.
  `is_head_teacher` grants full visibility/edit within their own school;
  `is_master_admin` grants it organization-wide.
- **`class_subject_teachers`** — who teaches what: (school, grade, subject)
  → teacher, per school year. Reassigning a class or merging two grades
  under one teacher is just updating this table (the `/school` admin page
  does this with dropdowns).
- **`students`** — one row per learner, with a current grade level. History
  across years lives in `student_enrollments`.
- **`attendance_records`** — one row per student per school day per session
  (AM/PM; Fridays are AM-only, enforced by a database trigger).
- **`weekly_scores`** — quiz and homework/participation entries, one row
  per student/subject/quarter/week.
- **`quarter_exam_scores`** — the quarterly exam, one row per student/
  subject/quarter.
- Grades are never stored pre-computed — `quarterly_grades`, `final_grades`,
  and `student_general_average` are SQL views that compute the weighted
  average live, so changing a single quiz score instantly updates every
  downstream number (dashboards, report cards, exports).

All of the above is protected by row-level security (`0004_rls.sql`): a
regular teacher's queries are automatically scoped to their assigned
classes by Postgres itself, not by application code remembering to filter —
the same guarantee holds whether the request comes from the web app, the
WhatsApp webhook, or someone querying the database directly with a teacher's
credentials.

## Project layout

```
src/app/                    Next.js routes (App Router)
  (app)/                    Authenticated shell: dashboard, students,
                             grades, attendance, school admin, org admin,
                             reports — each with its own actions.ts for
                             server-side mutations.
  api/                      Route handlers: WhatsApp webhook, CSV exports,
                             the pre-login teacher directory.
  login/                    Public login flow (school → name → password).
src/components/             UI, grouped by feature area.
src/lib/                    Supabase clients, domain logic (grading math,
                             attendance rules, quarter/week calculations),
                             hand-written DB types.
supabase/migrations/        SQL schema, RLS, views — run in order.
supabase/seed/               Reference-data seed + teacher CSV importer.
docs/                       Setup and compliance notes (see above).
```
