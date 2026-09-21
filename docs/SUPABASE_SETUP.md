# Supabase backend — setup guide

Everything the app needs lives in `supabase/migrations/` (schema, RLS, views)
and `supabase/seed/` (reference data + the teacher import script). This
walks through standing up a fresh Supabase project and wiring the app to it.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com/) → New Project.
2. Pick a name (e.g. `kesi-grades`), a strong database password (save it —
   you won't see it again), and a region close to the Philippines
   (Singapore is usually the best latency).
3. Wait for provisioning (~2 minutes).

## 2. Run the migrations

Open **SQL Editor** in the Supabase dashboard and run each file in
`supabase/migrations/` **in order** — paste the contents of one file, run
it, then move to the next:

1. `0001_schema.sql` — core tables (schools, grade levels, subjects,
   teachers, students, class assignments, school years/quarters).
2. `0002_attendance_and_grades.sql` — attendance and grade tables.
3. `0003_views.sql` — computed views (quarterly grades, attendance
   summaries, weekly-entry compliance).
4. `0004_rls.sql` — row-level security policies (this is what keeps a
   regular teacher from seeing another teacher's students).
5. `0005_seed_reference_data.sql` — the 5 schools, 7 grade levels, 8
   subjects, and the 2026–2027 school year/quarters from your calendar.
6. `0006_teacher_privilege_guard.sql` — a safety trigger that stops a head
   teacher from promoting someone (or themselves) to master admin or moving
   a teacher between schools; only master admin can do that.
7. `0007_student_demographic_fields.sql` — parent names, mother tongue,
   IP group, religion, home address (matches a typical SF1 register).
8. `0008_student_edit_permissions.sql` — lets any teacher who can see a
   student fix a typo in their name/info; grade, section, school, and
   status stay locked to the head teacher/master admin.
9. `0009_class_sections.sql` — adds "classes" (sections): lets a grade be
   split between two teachers (e.g. two Kindergarten A classes), each only
   seeing their own half. Every grade gets a default "Main" section
   automatically. **If you ran an earlier copy of this file that stopped on
   `cannot change name of view column`, run this version again** — it is
   written to be safely re-runnable and will finish the half-applied parts.
10. `0010_section_autoassign.sql` — puts every student into a class
    automatically (existing students included), and stops the permission
    guards from blocking writes made from the SQL Editor or by the
    service-role key, which have no signed-in user to check.

11. `0011_kaupawan_secondary.sql` — adds Kaupawan, the sixth campus and
    the only one running Grades 6-12, along with grade levels G6-G12.
    It switches those grades on at Kaupawan only, and leaves the other
    five campuses on Kindergarten A through Grade 5.

Every migration is safe to run twice, so if you lose track of where you
got to, just run them all again from the top.

If you prefer the CLI instead of pasting into the dashboard:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

(`db push` applies every file under `supabase/migrations/` in filename
order — that's why they're numbered.)

## 3. Turn off public sign-ups

Teachers are provisioned by you (via the import script below), not by
self-registration. In the dashboard: **Authentication → Providers → Email**
→ turn **off** "Allow new users to sign up". Email confirmation can also be
turned off since you're creating accounts directly with a known email and a
temporary password (the import script sets `email_confirm: true` anyway, so
this mostly matters if you ever create a user by hand in the dashboard).

## 4. Collect your API keys

**Project Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` — **never** put this in a
  `NEXT_PUBLIC_*` variable or commit it; it bypasses every RLS policy. It's
  only used by the teacher import script, the pre-login directory API
  route, and the WhatsApp webhook — all server-only code.

Copy `.env.example` to `.env.local` and fill these in.

## 5. Add your teachers

**The easiest way** (no terminal needed): open the site as an admin (or a
head teacher, for their own school), go to **School Admin**, and use the
**Add teacher** button — it creates their login and roster entry directly
from the browser. Good for one-off additions and for anyone who doesn't
have Node/the repo set up locally.

**For a big bulk import** (e.g. onboarding every school at once), the CSV
script is faster:
1. Copy `supabase/seed/teachers.template.csv` to `supabase/seed/teachers.csv`
   and replace it with your real roster. Columns:
   - `full_name`, `email`, `temp_password` — their login. Tell them to
     change the password after first login.
   - `school_slug` — one of `agbalite`, `binuangan`, `pinagbayanan`,
     `sulong-ipil`, `baraas` (blank for the master admin row).
   - `is_head_teacher`, `is_master_admin` — `true`/`false`.
   - `whatsapp_number` — E.164 format (`+639171234567`), optional, needed
     only if they'll use the WhatsApp integration.
   - `grade_codes` — semicolon-separated grade codes they teach (`KA`, `KB`,
     `G1`–`G5`). Leave blank for head teachers/admin (they see everything
     in their school already).
   - `subject_codes` — semicolon-separated subject codes (`bible`, `math`,
     `english`, `filipino`, `science`, `social_studies`, `music_arts`,
     `pe_health`). A homeroom teacher covering every subject for their
     grade(s) lists all eight.
   - `section_name` — which class, if the grade is split between two
     teachers (e.g. `A` / `B`). Leave as `Main` (or blank) when a grade
     has only one class.
2. Run it (requires Node and a local clone of the repo):
   ```bash
   SUPABASE_URL=https://xxxx.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
   npm run seed:teachers -- supabase/seed/teachers.csv
   ```
3. Re-running is safe — it matches existing teachers by email and updates
   them instead of creating duplicates.

## 6. Deploy the app

Any Next.js host works (Vercel or Netlify both auto-detect Next.js from
the repo). Set these environment variables on the host:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (required — open testing mode runs on it)
- `REQUIRE_LOGIN` — see below
- The `WHATSAPP_*` variables once you've done the WhatsApp setup (see
  `docs/WHATSAPP_INTEGRATION.md`) — the app runs fine without them, it just
  logs instead of sending.

## 6b. Open testing mode vs. locked down

**The app ships open.** With no `REQUIRE_LOGIN` variable set, there is no
sign-in at all: anyone with the URL lands straight on the dashboard with
full master-admin access, and a **"Viewing as"** picker in the top bar lets
you walk the site as any teacher on the roster to check what they'd see. An
orange banner sits on every page so it can't be forgotten. This is for
clicking through the UI before real student records go in.

To lock it down, set **`REQUIRE_LOGIN=true`** on the host and redeploy. The
login screen, the session check, and every row-level-security policy come
back with no other change. Do that before real student data goes in, and
before the URL goes anywhere outside your team.

## 7. Sanity-check RLS

After importing a couple of teachers, log in as a regular (non-head) teacher
and confirm they only see their own students on `/students`. Then log in as
a head teacher and confirm they see the whole school. If a regular teacher
can see students outside their assigned grade, something's off with the
`class_subject_teachers` rows for them — check `/school` (as a head teacher
or master admin) to see/fix the assignment.

## 8. Updating the school calendar

If a quarter date changes (e.g. the Q2 exam-week collision with Christmas
break flagged in `docs/DEPED_COMPLIANCE.md`), edit the `quarters` table
directly in the Supabase Table Editor, or via SQL:

```sql
update quarters
set exam_week_start = '2026-12-15', exam_week_end = '2026-12-18'
where school_year_id = (select id from school_years where label = '2026-2027')
  and number = 2;
```

## 9. Rolling into a new school year

Insert a new `school_years` row with `is_current = true` (the unique index
`one_current_school_year` automatically means you must first set the old
year's `is_current` to `false` in the same transaction), then insert its
four `quarters` rows and a `grade_weight_configs` row, same shape as
`0005_seed_reference_data.sql`. Existing students keep their history because
grades/attendance are keyed by `school_year_id`, not overwritten.
